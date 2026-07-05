# Upstream dependencies

No upstream source code is vendored in this repository.

| Project | Use | Pin |
|---|---|---|
| Harbor | Evaluator, environments, datasets, verifiers, result model, competitor adapters | PyPI `harbor==0.17.1` |
| Tersa | Agent under test | npm `tersa-cli@0.16.5` |
| Superpowers | Default Tersa workflow skills | `obra/superpowers@add6a283b17c90dba37fe538b02b7242a512d35f` |
| GSD Pi | Default Tersa GSD skill library | `open-gsd/gsd-pi@c117986d773d5837a76329b3149e478936e99a42` |
| Ponytail | Efficiency treatment | `DietrichGebert/ponytail@b8f20b8e7cc933c516d8928a7e4f3786df05fb65` |
| Karpathy Guardrails | Surgical-change treatment | immutable Blueprint mirror at `ea21be1e1acc285ada59429a9835ef7447a0194f` |
| Terminal-Bench 2 | Initial task dataset | Harbor package ref must be locked by the first run |
| SWE-bench Verified | Later task dataset | lock before use |

The Tersa adapter subclasses Harbor's public `ClaudeCode` adapter. Each project retains its own license.
