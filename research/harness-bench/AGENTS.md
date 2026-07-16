# Repository rules

This repository measures agent harnesses and Tersa profiles. Benchmark integrity is more important than making Tersa look good.

- Reuse Harbor unless a concrete missing capability is demonstrated.
- Never modify a task, verifier, timeout, budget, or metric after inspecting comparative results.
- Keep task, model, provider, environment, permissions, and budget identical inside a comparison group.
- Keep GSD and Superpowers enabled in every Tersa profile-ablation arm.
- Change CAVE, Ponytail, and Karpathy one at a time.
- Never merge bare-harness and configured-workflow results into one causal claim.
- Never merge different model islands into one efficiency ranking.
- Missing cost or token data is `NA`, not zero.
- Do not publish canary or unlocked pilot results.
- Preserve raw logs, trajectories, profile manifests, configs, lock files, diff metrics, and verifier output.
- Any adapter or profile change requires rerunning the profile canary.
- Record methodological changes in `docs/DECISIONS.md`.
