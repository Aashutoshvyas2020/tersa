# Tersa adapter and profile validation

The adapter inherits Harbor's Claude Code session parser. This saves duplicated parser code, but it remains an assumption to verify against raw Tersa output.

No profile result is publishable until the compatibility canary satisfies every check below.

## Installation and identity

- Harbor installs the exact requested `tersa-cli` version.
- `tersa --version` matches the trajectory version.
- Agent names remain distinct: `tersa-workflow`, `tersa-workflow-no-cave`, `tersa-workflow-ponytail`, `tersa-workflow-karpathy`, or `tersa-bare`.
- Model and provider match the job config.
- `agent/benchmark-profile.json` matches the trajectory agent metadata.

## Skill integrity

Before model execution:

```bash
uv run python scripts/verify_skill_sources.py
```

Confirm:

- the immutable source commits resolve
- `using-superpowers` is present
- the GSD skill library contains `create-skill`
- Ponytail contains `ponytail`
- the Karpathy source contains `karpathy-guardrails`
- the materializer records exact source commits and Harbor records local skill digests in the job lock

The Tersa adapter also checks the copied skill directories inside the sandbox and fails before inference when a required profile skill is absent.

## Default workflow parity

For every profile-ablation arm:

- GSD and Superpowers local materialized paths and source manifests are identical in the resolved job config
- the model, task, budget, timeout, permissions, environment, and effort are identical
- only one treatment changes from the workflow baseline

Expected changes:

- no-CAVE: only `TERSA_CAVE_MODE=0`
- Ponytail: only the Ponytail skill and Ponytail activation instruction
- Karpathy: only the Karpathy skill and activation instruction

## Execution parity

- Tersa receives Harbor's exact task instruction.
- It runs in the same task image and working directory.
- The verifier is inaccessible until grading.
- Host settings, memories, and unrelated credentials are absent.
- The appended profile instruction is retained in raw command/debug evidence.

## Trajectory fidelity

Compare raw `tersa.txt` and session JSONL with `agent/trajectory.json` for at least one pass and one failure per profile.

Verify:

- every model call appears once
- every tool call has correct arguments, output, and ordering
- subagent activity is retained
- input, output, cache-read, and cache-creation tokens reconcile
- final cost reconciles with raw provider/Tersa evidence
- interruption preserves prior usage
- malformed lines remain visible in logs

## CAVE validation

For `tersa-workflow-no-cave`:

- manifest and environment show `TERSA_CAVE_MODE=0`
- Tersa debug/status evidence confirms CAVE is disabled
- no CAVE-only compression metadata appears
- GSD, Superpowers, and every non-CAVE setting match `tersa-workflow`

## Diff metrics

For every Tersa trial, inspect:

- `agent/diff-numstat.tsv`
- `agent/diff-files.txt`
- `agent/git-status.txt`

Reconcile a sample against the final sandbox repository. Binary-file numstat rows must not be converted into zero changed lines.

## Required commands

```bash
uv run python scripts/audit_job.py jobs/<canary-job>
uv run python scripts/summarize_efficiency.py jobs/<canary-job>
```

These are minimum completeness gates and do not replace manual raw-event reconciliation.
