# Decisions

## D001: Use Harbor, not a custom evaluator

Accepted. Harbor owns orchestration, environments, datasets, verification, trajectories, and competitor adapters.

## D002: Keep the benchmark repository neutral

Accepted. Tersa is one measured harness and receives no evaluator privileges.

## D003: Add Tersa through Harbor's custom import path

Accepted. This avoids a Harbor fork.

## D004: Reuse Harbor's Claude-compatible trajectory parser

Accepted provisionally. Raw Tersa logs must reconcile with ATIF output before publication.

## D005: Separate model islands

Accepted. Claude and OpenAI comparisons are analyzed independently.

## D006: Separate bare harness and configured workflow studies

Accepted. Cross-harness comparisons use `TersaBareAgent`. Tersa mode/profile comparisons use a common GSD + Superpowers baseline.

## D007: Make CAVE ablation mandatory

Accepted. The no-CAVE arm retains the same GSD and Superpowers inputs.

## D008: Test Ponytail and Karpathy separately

Accepted. Each is compared with the common workflow baseline and is not combined with the other in the primary study.

## D009: Pin upstream skill sources and fail closed

Accepted. The preflight fetches exact commit objects into ignored local directories, verifies them with Harbor, and Tersa refuses to run when a required `SKILL.md` is missing.

## D010: Add minimal aggregation only for missing profile metrics

Accepted. Harbor remains the source of truth. `summarize_efficiency.py` only aggregates Harbor results and Tersa's captured git diff statistics.
