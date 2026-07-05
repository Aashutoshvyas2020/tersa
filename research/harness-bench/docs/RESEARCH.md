# Reuse investigation

Research was performed against current upstream repositories on July 5, 2026.

## Selected foundation: Harbor

Repository: `harbor-framework/harbor`
Inspected version: `0.17.1`
Inspected commit: `743565a82dbef521adc1ae5146f9751811ea3adb`
License: Apache-2.0

Harbor was selected because it already provides the expensive and credibility-sensitive parts of this project:

- isolated task environments
- external verifiers
- Terminal-Bench and SWE-bench dataset support
- built-in Claude Code, Codex, OpenCode, and Pi adapters
- normalized ATIF trajectories
- token, cache, cost, tool, and timing records
- multiple attempts and concurrency controls
- immutable job inputs and result directories
- a visual job comparison interface
- custom agent import paths

Harbor also maintains adapter parity evidence against original benchmark implementations. That does not prove every adapter is perfect, but it is stronger evidence than a newly written local runner.

Decision: depend on Harbor as a pinned package. Do not fork or vendor it.

### Release-package verification

The scaffold was tested against the actual PyPI `harbor==0.17.1` package, not only Harbor's current GitHub main branch. One concrete mismatch was found: current main contains a shared `node_install` helper, while the released package does not ship that module. The Tersa adapter therefore uses the same inline NVM/Node 22 installation sequence already present in Harbor 0.17.1's released Pi and OpenCode adapters.

This check prevented the scaffold from depending on unreleased upstream code.

## Terminal-Bench

Repositories: `harbor-framework/terminal-bench-2` and Harbor's package registry.

Terminal-Bench is the first task source because Harbor is its official evaluator and its tasks are designed for agents operating in terminal environments.

Decision: reuse the packaged dataset and verifier. Do not copy tasks into this repository.

## SWE-bench

Repository: `SWE-bench/SWE-bench`.

SWE-bench provides a Docker evaluator for real GitHub issues, and SWE-bench Verified contains 500 engineer-reviewed solvable instances.

Decision: add it after the Terminal-Bench canary. Use Harbor's SWE-bench adapter so all harnesses remain under one orchestration and result schema.

## Aider Polyglot

Aider's polyglot benchmark is useful for focused code-editing performance but covers a narrower workflow than general agentic repository tasks.

Decision: retain as a later secondary suite, not the first benchmark.

## Existing agent adapters verified

The Harbor source was inspected rather than accepted from its README alone:

- Claude Code emits stream JSON and Harbor converts session logs to ATIF, including cache usage and authoritative result cost.
- Codex session events are converted into ATIF with input/output/cache/reasoning tokens; Harbor derives cost from its pricing table when available.
- OpenCode's JSON stream includes step boundaries, tool calls, usage, and cost.
- Pi's JSON mode exposes input/output/cache usage and cost.
- Harbor's agent factory supports custom import paths, allowing Tersa to be added without modifying Harbor.

## Tersa-specific reuse

Tersa 0.16.5 retains a Claude-compatible headless stream and session format. The adapter subclasses Harbor's Claude Code adapter and reuses its trajectory parser.

This is the highest-risk reuse decision. It is provisional until raw Tersa logs reconcile with the generated ATIF trajectory. See `ADAPTER_VALIDATION.md`.

## Rejected approach

A custom Docker orchestrator, task schema, verifier API, result database, trajectory format, and four competitor wrappers would duplicate Harbor and make benchmark credibility depend on unreviewed code controlled by the product being measured.

That approach was rejected.

## Workflow and efficiency profiles

The profile study reuses upstream skills rather than paraphrasing them:

- Superpowers from `obra/superpowers`
- current GSD Pi skills from `open-gsd/gsd-pi`
- Ponytail from `DietrichGebert/ponytail`
- Karpathy Guardrails from the immutable JuliusBrussee Blueprint mirror

The exact required `SKILL.md` files were verified at the recorded commits.
Ponytail explicitly defines `full` as its default intensity. Karpathy Guardrails
defines four controls: think before coding, simplicity first, surgical changes,
and goal-driven execution.

Harbor 0.17.1 resolves Git skill refs using `git ls-remote <ref>`. Raw object IDs
are not a reliable ref-pattern input, so direct commit URLs were rejected for
this benchmark. The repository instead fetches each exact commit object itself,
sparse-copies the declared skill subdirectory, verifies the object ID, and then
passes a local path to Harbor for structural validation and digesting.

GSD Pi is a larger agent runtime. Injecting its skill library into Tersa does
not reproduce GSD Pi's daemon, state database, UI, or worktree orchestration.
The benchmark labels this accurately as the GSD workflow/skills available to
Tersa.
