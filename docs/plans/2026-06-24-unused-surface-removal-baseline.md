# Tersa unused-surface removal baseline

Date: 2026-06-24

This document records the repository and behavior baseline before any unused-surface removal. It is not an implementation plan and does not authorize deletion beyond the separately approved phases.

## Repository identity

- Starting branch: `release/tersa-gates-packaging`
- Starting commit: `359af5742d8f5ec633ebd629be0c8652c9a451a6`
- Starting commit subject: `Remove deprecated command surfaces`
- Package: `tersa-cli`
- Version: `0.16.2`

## Pre-existing working tree

Before this baseline document was added, the checkout contained a large unfinished rebrand and packaging change:

- 248 files in the unstaged diff
- 4 files in the staged diff
- 913 additions and 7,138 deletions in the unstaged diff
- 636 staged deletions
- 19 untracked paths

These changes predate the unused-surface cleanup. Future phases must not describe them as cleanup work.

## Size and dependency baseline

- Tracked files: 2,631
- TypeScript/JavaScript lines under `src`, `scripts`, `tests`, and `bin`: 647,935
- Runtime dependencies: 66
- Development dependencies: 5
- Built CLI size: 21,398,085 bytes
- Built SDK size: 10,430,747 bytes
- npm dry-run tarball size: 6.8 MB
- npm dry-run unpacked size: 31.9 MB
- npm dry-run file count: 9

Published-package dry-run contents:

- `LICENSE`
- `README.md`
- `bin/import-specifier.mjs`
- `bin/tersa`
- `dist/cli.mjs`
- `dist/sdk.mjs`
- `package.json`
- `src/entrypoints/sdk.d.ts`
- `src/entrypoints/sdk/coreTypes.generated.ts`

## Startup timing baseline

Five `node dist/cli.mjs --version` runs:

- 0.57 seconds
- 0.54 seconds
- 0.55 seconds
- 0.55 seconds
- 0.54 seconds

Mean: approximately 0.55 seconds.

## Verification results

### Build

Command: `bun run build`

Result: PASS

- CLI bundle built successfully.
- SDK bundle built successfully.
- 191 files were transformed by the feature-flag build pass.
- SDK bundle reported no React/Ink leakage.
- CLI external list reported zero missing dependencies.
- SDK external list reported zero missing dependencies.
- SDK declarations matched 56 exports.

### Smoke

Command: `bun run smoke`

Result: PASS

Observed version output: `0.16.2 (Tersa)`.

### Focused Tersa tests

Command: `bun run test:tersa:focused`

Result: PASS

- 107 tests passed.
- 0 tests failed.
- Covered startup branding, provider selection, model selection, modes, permissions, status, status line, Cave Mode compression, token benchmarks, internal prompt compression, skill compression, and session-canary behavior.

### Skill, plugin-loader, and MCP tests

Command:

`bun test --max-concurrency=1 src/skills/loadSkillsDir.test.ts src/skills/mcpSkills.test.ts src/tools/SkillTool/SkillTool.test.ts src/utils/plugins/pluginLoader.test.ts src/services/mcp/doctor.test.ts src/services/mcp/client.test.ts`

Result: PASS

- 53 tests passed.
- 0 tests failed.
- Direct skill loading, MCP skill loading, privilege stripping, plugin path containment, symlink escape protection, plugin skill rendering, MCP doctor behavior, and MCP cleanup behavior passed.

### Privacy

Command: `bun run verify:privacy`

Result: PASS

No banned phone-home or internal-service patterns were found in `dist/cli.mjs`.

### Package dry run

Command: `npm pack --dry-run`

Result: PASS

The dry run rebuilt the package and produced the nine-file package listed above.

### TypeScript baseline

Command: `bun run typecheck:tersa:baseline`

Result: PASS AGAINST EXISTING BASELINE

- Current baseline diagnostics: 1,610
- Diagnostics resolved relative to the stored baseline: 13

This is not a clean TypeScript result. Future phases must not claim that the repository currently has zero type errors.

### Interactive TUI canary

Command: `bun scripts/tersa-tui-canary.ts --startup-only`

Result: PASS

The startup-only PTY canary passed.

The full multi-width interactive canary was also attempted through `bun run test:tersa:interactive`. It was terminated by the outer workspace execution limit with SIGTERM before producing an assertion result. This is recorded as INCONCLUSIVE, not as a product failure. Unit tests for the canary and the startup-only PTY path remain green.

## Current user-facing CLI baseline

Top-level help currently exposes these subcommands:

- `agents`
- `auth`
- `auto-mode`
- `doctor`
- `install`
- `mcp`
- `plugin`
- `setup-token`
- `update`

Top-level options currently include direct session plugin loading through `--plugin-dir` and MCP loading through `--mcp-config`.

The cleanup must preserve direct plugin capability, skills, MCP, provider selection, terminal presentation, token display, permissions, Cave Mode, local resume, and the session canary unless a later phase explicitly authorizes otherwise.

## Existing plugin-state baseline

Both the Tersa and legacy Claude plugin stores currently contain:

- Marketplace record: `claude-plugins-official`
- Marketplace record: `cavekit-local`
- Installed plugin: `ck@cavekit-local`
- Installed plugin version: `3.0.0`
- Scope: user
- Installation path exists
- Installation includes `.claude-plugin/plugin.json` and `plugin.json`

Marketplace removal must migrate this plugin to a direct source record before marketplace state is retired. A failed migration must leave the existing state usable.

## Release-target normalization

Before Phase 1, the release workflow, release-please package target, Docker smoke image, and lockfile root package identity were normalized to the Tersa repository and `tersa-cli` npm package. Historical release notes are intentionally outside this branding pass.

The local git remotes still target `Gitlawb/openclaude` and `Aashutoshvyas2020/openclaude`. The public `Aashutoshvyas2020/tersa` destination was not discoverable during verification. The GitHub repository must be renamed or created first, then both local remotes must be updated before the release workflow can run from the intended repository.

Verification after normalization:

- Release workflow YAML parsing passed.
- Release-please JSON parsing passed.
- `package.json` and release-please both target `tersa-cli`.
- Release-surface audit passed.
- Shipped-surface branding audit passed.
- Build and smoke passed; the binary reports `0.16.2 (Tersa)`.
- Focused Tersa tests passed: 107 passed, 0 failed.
- Privacy verification passed.

## Pre-Phase-1 blockers

Phase 1 must not start until all of the following are true:

- The GitHub repository has been renamed or recreated as `Aashutoshvyas2020/tersa`.
- Local `origin` points to `https://github.com/Aashutoshvyas2020/tersa.git`.
- The personal fork either exists as `Aashutoshvyas2020/tersa` and the `fork` remote is updated, or the obsolete fork remote is removed.
- The entire current working tree is committed as a pre-removal checkpoint.
- Cleanup work begins on a new branch created from that checkpoint.
- Active contributor and issue-template links no longer target OpenClaude.
- The environment example documents `TERSA_*` variables instead of `OPENCLAUDE_*` variables.

Files under `python/` and `vscode-extension/` may retain stale names until Phase 1 because those directories are approved deletion candidates and should not receive churn immediately before removal. Historical release notes and legal provenance text are intentionally excluded from the branding sweep.

## Phase gates

Every removal phase must compare against this baseline and report:

- Source-line change
- Dependency change
- CLI and SDK bundle-size change
- Package-size change
- Startup-time change
- Build result
- Focused test result
- Plugin/skill/MCP test result where relevant
- Privacy result
- Package dry-run result
- Interactive startup-canary result
- New, resolved, or unchanged TypeScript baseline diagnostics

No phase may proceed automatically after its report is produced.
