# Phase 1 — Detached Product Surface Removal

Date: 2026-06-24
Branch: `cleanup/remove-unused-surfaces`
Checkpoint: `c605f6e` (`checkpoint/tersa-pre-removal`)

## Scope removed

- VS Code product: `vscode-extension/tersa-vscode/**`
- Web product: `web/**`
- Standalone Python helpers and tests: `python/**`
- Headless gRPC bridge:
  - `src/grpc/server.ts`
  - `src/proto/tersa.proto`
  - `scripts/start-grpc.ts`
  - `scripts/grpc-cli.ts`
- Related root scripts, runtime dependencies, CI jobs, documentation, bundle externals, and TypeScript baseline entries

## Preserved

- Core Tersa CLI runtime and custom terminal renderer
- Provider/model selection and status/token UX
- Permissions, Cave Mode, session canary, compaction, agents, and core coding tools
- MCP, direct plugins, skills, and generic IDE/editor integration
- Existing local session/history behavior

## Verification

All Phase 1 checks passed:

- `bun run build`
- `bun run test:tersa:focused` — 107 passed, 0 failed
- Plugin/skill/MCP suite — 53 passed, 0 failed
- `bun run test:tersa` — 182 passed, 0 failed
- `bun run verify:privacy`
- `bun run typecheck:tersa:baseline` — baseline held at 1,596 current errors, 13 resolved
- `bun run release:npm:dry-run`
- Interactive TUI canary
- `git diff --check`
- Stale-reference scan for removed surfaces

## Metrics

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Working-tree files | 2,631 | 2,586 | -45 |
| Diff lines removed | — | 8,950 | -8,950 |
| TS/JS lines under `src`, `scripts`, `tests`, `bin` | 647,935 | 647,500 | -435 |
| Runtime dependencies | 66 | 64 | -2 |
| Dev dependencies | 5 | 5 | 0 |
| CLI bundle bytes | 21,398,085 | 21,398,670 | +585 |
| SDK bundle bytes | 10,430,747 | 10,430,692 | -55 |
| npm packed files | 9 | 9 | 0 |
| npm tarball bytes | approximately 6.8 MB | 6,749,716 | effectively unchanged |
| npm unpacked bytes | approximately 31.9 MB | 31,933,679 | effectively unchanged |

The bundle and package sizes stayed essentially flat because the deleted products were detached from the shipped CLI bundle. The meaningful reductions are repository surface area, CI paths, dependencies, and maintenance burden.

## Result

Phase 1 passed. No protected Tersa behavior was removed, no stale active references remain, and the branch is ready to be sealed as a single reversible phase commit.

Stop here before Phase 2A. Phase 2A requires explicit approval because it changes plugin storage and migrates CaveKit away from marketplace-backed state.
