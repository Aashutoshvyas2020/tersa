# Tersa Research

This directory contains reproducible research and evaluation tooling for Tersa.

## Harness Bench

[`harness-bench/`](harness-bench/) is the external-verifier benchmark harness for comparing:

- bare Tersa against Claude Code, Codex, OpenCode, and Pi on the same model and task
- Tersa with CAVE enabled versus disabled
- Ponytail and Karpathy Guardrails as separate efficiency treatments
- the common Tersa workflow with GSD and Superpowers enabled

The benchmark is experimental. Canary runs establish adapter and telemetry correctness; they are not performance claims. Read [`harness-bench/docs/METHODOLOGY.md`](harness-bench/docs/METHODOLOGY.md) before running or changing an experiment.
