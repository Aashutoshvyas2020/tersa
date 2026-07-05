# Benchmark methodology

## Research questions

The core harness study asks whether one harness achieves more externally verified solutions with less model usage, cost, or elapsed time when task, model, provider, environment, and budget are fixed.

The Tersa profile study asks three paired questions:

1. What changes when CAVE is disabled while GSD and Superpowers remain fixed?
2. What changes when Ponytail full is added to that common workflow?
3. What changes when Karpathy Guardrails is added instead?

These are separate questions. Results from different model islands or different treatment combinations are not merged into one causal claim.

## Experimental unit

One trial contains one immutable task, one exact model route, one harness/profile configuration, one attempt, one external verifier result, one retained trajectory, and one usage record.

Harbor owns environment creation, task delivery, timeout enforcement, verification, and result collection.

## Comparison groups

### Model islands

Claude and OpenAI runs are analyzed independently. Cross-island values may be displayed but cannot establish harness efficiency because the model and pricing changed.

### Core harness track

Bare Tersa, Claude Code, Codex, OpenCode, and Pi are compared without GSD, Superpowers, Ponytail, or Karpathy. This isolates the harness as closely as practical.

### Tersa profile track

Every arm receives the same pinned GSD and Superpowers skill inputs. CAVE, Ponytail, and Karpathy are changed one at a time. See `PROFILE_MATRIX.md`.

## Task selection

Start with Terminal-Bench 2 because it contains executable container tasks and Harbor is its official harness. Add SWE-bench Verified after the adapter and profile canaries pass.

Before publication:

- lock the dataset package ref or content hash
- use explicit task names instead of `n_tasks`
- retain task definitions and Harbor lock files
- do not change tasks after inspecting comparative behavior
- define exclusions before aggregate calculation

## Attempts and order

Use at least three independent attempts for every task/arm cell. Randomize or interleave execution order so time-of-day and provider-load effects do not systematically favor an arm.

Infrastructure retries are separate from benchmark attempts. Agent errors, timeouts, and context exhaustion remain outcomes unless a documented infrastructure failure invalidated the trial.

## Cache policy

Report cold-cache and warm-cache runs separately. Cold-cache trials must not reuse session history, generated repository maps, prior artifacts, or provider cache state where controllable.

## Metrics

Primary metrics are:

- externally verified pass rate
- input, output, and cache tokens
- tokens per verified pass
- API cost and cost per verified pass
- agent time and time per verified pass

Profile efficiency diagnostics also include:

- files changed
- lines added and deleted
- exceptions and timeouts
- model and tool-call counts where available

A smaller diff or lower token count is not a win when verified success falls. Missing evidence is `NA`, not zero.

## Skill and profile integrity

Skill sources are exact repository commits. Before a paid run, `scripts/verify_skill_sources.py` fetches each raw commit into `.bench-skills/`, verifies the checked-out object ID, then asks Harbor to validate expected `SKILL.md` names and calculate digests.

Every Tersa trial writes `agent/benchmark-profile.json`. The job audit checks profile identity, CAVE state, required skill names, trajectory fields, and diff evidence.

GSD in this benchmark means the current GSD Pi skill library plus a small activation instruction. It does not claim to run GSD Pi's full daemon, state database, UI, or worktree orchestration inside Tersa.

## Statistical reporting

For the full benchmark:

- publish per-task and per-attempt outcomes
- use paired comparisons
- include bootstrap confidence intervals over tasks
- report attempt-level variance
- avoid rankings when uncertainty materially overlaps
- disclose aggregation formulas

## Claim boundary

Canaries prove compatibility and telemetry only. Ten-task pilots are exploratory. A public claim requires a preregistered task set, at least three attempts, complete telemetry, source verification, and adapter reconciliation.
