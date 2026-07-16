# Handoff

## Current state

The repository contains a validated Harbor-based benchmark scaffold. No paid benchmark has been executed.

Local verification against `harbor==0.17.1` currently passes:

- Ruff
- 21 unit tests
- Harbor `JobConfig` validation for all six configs
- Python compilation
- clean git diff checks

Pinned skill files were independently confirmed through GitHub. The local sandbox has no outbound DNS, so the runtime source-resolution preflight must run in the actual benchmark environment.

## First command

```bash
uv sync --extra dev
uv run python scripts/validate_configs.py
uv run pytest
uv run python scripts/verify_skill_sources.py
```

## First live gate

With Docker running and an Anthropic credential configured:

```bash
./scripts/run_canary.sh
```

This runs one task across workflow, no-CAVE, Ponytail, and Karpathy arms.

After completion:

```bash
uv run python scripts/audit_job.py jobs/<job-directory>
uv run python scripts/summarize_efficiency.py jobs/<job-directory>
uv run harbor view jobs
```

## Required manual work

Compare raw `tersa.txt` and session JSONL against `agent/trajectory.json` for every profile. Confirm profile manifests, skill loading, CAVE state, token/cache/cost accounting, tool calls, and diff metrics.

Do not advance to a pilot until the canary passes.

## Remaining work

- Pin exact Claude Code, OpenCode, Pi, and Codex versions.
- Replace `n_tasks` with a preregistered explicit task list.
- Lock the resolved Terminal-Bench package ref.
- Equalize reasoning settings where supported.
- Run the Claude and OpenAI profile pilots.
- Run the bare cross-harness pilots.
- Add confidence intervals only after real multi-attempt data exists.
