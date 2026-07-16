# Harness Bench

A neutral, reproducible benchmark layer for comparing coding-agent harnesses and Tersa execution profiles on externally verified tasks.

**Status:** experimental scaffold. No benchmark results or performance claims have been produced.

Harness Bench uses Harbor for sandboxing, datasets, verification, result storage, trajectories, and its existing Claude Code, Codex, OpenCode, and Pi adapters. This repository adds a Tersa adapter, controlled profile ablations, experiment configs, and publication rules.

## What it evaluates

There are two separate studies.

### Core harness comparison

Bare Tersa is compared with Claude Code, Codex, OpenCode, and Pi using the same task, model, provider, environment, permissions, and budget. No third-party workflow profile is enabled in this track.

### Tersa profile ablation

GSD and Superpowers are the common default for every Tersa profile arm:

| Arm | CAVE | GSD | Superpowers | Added treatment |
|---|---:|---:|---:|---|
| `tersa-workflow` | on | on | on | none |
| `tersa-workflow-no-cave` | off | on | on | none |
| `tersa-workflow-ponytail` | on | on | on | Ponytail full |
| `tersa-workflow-karpathy` | on | on | on | Karpathy Guardrails |

This isolates CAVE, Ponytail, and Karpathy one at a time. Ponytail and Karpathy are never combined in the primary study.

The profile study measures verified pass rate, tokens, API cost, agent time, exceptions, files changed, and diff lines. Efficiency claims are conditioned on external task success.

## Why Harbor

The benchmark should measure harness behavior, not reward Tersa for controlling its own evaluator. Harbor already provides:

- Docker-isolated tasks and external verification
- Terminal-Bench and SWE-bench dataset adapters
- Claude Code, Codex, OpenCode, and Pi runners
- ATIF trajectories with tool calls, model usage, cache usage, cost, and timing
- Multiple attempts, concurrency controls, result locks, and a comparison viewer
- Custom agents through a Python import path

The custom Tersa adapter subclasses Harbor's Claude Code adapter to reuse its session-to-ATIF parser while replacing installation, launch, identity, provider routing, profile activation, and output paths.

## Setup

From the Tersa repository root:

```bash
cd research/harness-bench
```

Requirements:

- Python 3.12+
- `uv`
- Docker
- Provider API credentials
- outbound GitHub access for pinned skill resolution
- sufficient disk space for the selected benchmark

```bash
uv sync --extra dev
uv run python scripts/validate_configs.py
uv run pytest
```

Verify every pinned skill source before spending model credits:

```bash
uv run python scripts/verify_skill_sources.py
```

Run the one-task, four-profile Claude compatibility canary:

```bash
export ANTHROPIC_API_KEY=...
./scripts/run_canary.sh
```

Inspect the output:

```bash
uv run python scripts/audit_job.py jobs/<job-directory>
uv run python scripts/summarize_efficiency.py jobs/<job-directory>
uv run harbor view jobs
```

The canary verifies installation, skill resolution, profile identity, CAVE state, session capture, ATIF conversion, token and cost accounting, diff capture, and external grading. It is not a performance study.

## Configs

- `configs/canary-profiles-claude.yaml`: one task across all four Tersa profiles.
- `configs/canary-claude.yaml`: smaller Tersa-versus-Claude adapter canary.
- `configs/draft-tersa-ablation-claude.yaml`: ten-task Claude profile study.
- `configs/draft-tersa-ablation-openai.yaml`: ten-task OpenAI profile study.
- `configs/draft-pilot-claude.yaml`: bare same-model harness comparison.
- `configs/draft-pilot-openai.yaml`: bare same-model harness comparison.

Draft pilots must replace `n_tasks` with a preregistered task-name list and lock all CLI versions before publication.

## Non-negotiable publication gates

A result is not publishable unless:

1. Every task begins from the same immutable task image and instruction within its comparison group.
2. Harbor, dataset, skill, agent, model, and environment versions are retained.
3. External verifiers determine success. Agent self-report is ignored.
4. Missing token or cost data is reported as `NA`, never zero.
5. Cold-cache and warm-cache runs are separated.
6. At least three attempts are completed per task and arm.
7. Pass rate, cost per pass, tokens per pass, time per pass, and diff size are reported together.
8. Tersa profile manifests and CAVE evidence pass `scripts/audit_job.py`.
9. Raw stream/session data reconcile with the generated ATIF trajectory.
10. Failures, timeouts, rate limits, and exclusions are disclosed.
11. No claim is based on Tersa's synthetic token-compression microbenchmark.

Read `docs/METHODOLOGY.md` and `docs/PROFILE_MATRIX.md` before changing experiment settings.
