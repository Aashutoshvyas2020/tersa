# Tersa profile matrix

The Tersa profile study is a controlled ablation. All four arms use the same
task, model, provider, permissions, budget, GSD skill library, and Superpowers
skill library.

| Arm | GSD | Superpowers | CAVE | Added treatment |
|---|---:|---:|---:|---|
| `tersa-workflow` | on | on | on | none |
| `tersa-workflow-no-cave` | on | on | off | none |
| `tersa-workflow-ponytail` | on | on | on | Ponytail full |
| `tersa-workflow-karpathy` | on | on | on | Karpathy Guardrails |

This supports three paired questions:

1. Does CAVE change verified success, tokens, cost, time, or diff size?
2. Does Ponytail improve efficiency relative to the same workflow baseline?
3. Does Karpathy Guardrails improve efficiency relative to that same baseline?

Ponytail and Karpathy are not combined in the primary study. Combining them
would make it impossible to attribute an effect to either treatment.

## Default workflow

GSD and Superpowers are on for every Tersa profile arm. The benchmark injects
their pinned upstream skill directories and appends a small activation
instruction. The activation asks Tersa to use the actual skills; it does not
reimplement their full contents.

The GSD input is the current GSD Pi skills library. This does not claim that the
full GSD Pi daemon, worktree manager, database, or UI is running inside Tersa.
The benchmark measures the GSD workflow and skills available to Tersa.

## Locked sources

- Superpowers: `obra/superpowers` at
  `add6a283b17c90dba37fe538b02b7242a512d35f`
- GSD Pi skills: `open-gsd/gsd-pi` at
  `c117986d773d5837a76329b3149e478936e99a42`
- Ponytail: `DietrichGebert/ponytail` at
  `b8f20b8e7cc933c516d8928a7e4f3786df05fb65`
- Karpathy Guardrails: immutable mirror of the JuliusBrussee Blueprint skill at
  `hashgraph-online/awesome-codex-plugins`
  commit `ea21be1e1acc285ada59429a9835ef7447a0194f`

`scripts/verify_skill_sources.py` fetches these exact commit objects into
`.bench-skills/`; Harbor then validates the local skills and records their
digests in the job lock.

## Efficiency outputs

Run:

```bash
uv run python scripts/summarize_efficiency.py jobs/<job-directory>
```

The report includes:

- verified pass rate
- tokens per verified pass
- cost per verified pass
- agent execution seconds per verified pass
- changed lines per attempt
- exceptions

Raw input, output, and cache-token fields remain available in Harbor results.
Missing data is reported as `NA`, never zero.

## Interpretation

Ponytail or Karpathy is better only when it maintains or improves external task
success while reducing one or more resource measures. A smaller diff that fails
the verifier is not efficient. A token reduction caused by stopping early is
not a win.
