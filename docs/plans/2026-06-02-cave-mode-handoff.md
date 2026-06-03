# Cave Mode + Caveman UI Handoff

## Scope completed

- Added internal Cave Mode compression layer in `src/utils/caveMode/`.
- Wired Cave Mode into tool execution in `src/services/tools/toolExecution.ts`.
- Kept existing query-stage compaction intact.
- Reused existing `Read` unchanged-file path instead of adding a second dedup cache.
- Reworked REPL/header/startup branding toward Caveman style.
- Switched Caveman palette to blue/cyan theme to match requested reference.
- Rebuilt and reinstalled local `openclaude` command from this checkout.

## Key files

- `src/utils/caveMode/config.ts`
- `src/utils/caveMode/index.ts`
- `src/utils/caveMode/structuredCompression.ts`
- `src/utils/caveMode/toolCompression.ts`
- `src/utils/caveMode/types.ts`
- `src/services/tools/toolExecution.ts`
- `src/services/tools/toolExecution.test.ts`
- `src/utils/settings/types.ts`
- `src/utils/theme.ts`
- `src/components/StartupScreen.ts`
- `src/components/StartupScreen.palettes.ts`
- `src/components/LogoV2/cavemanBrand.ts`
- `src/components/LogoV2/Clawd.tsx`
- `src/components/LogoV2/WelcomeV2.tsx`

## Behavior notes

- Cave Mode runs after `tool.call(...)` and before `mapToolResultToToolResultBlockParam(...)`.
- Compression touches model-facing tool output only.
- Raw hook flow, permission flow, `structured_output`, MCP tools, and attachments stay untouched.
- `Read` dedup uses existing `file_unchanged` behavior.
- Bash structured compression supports large JSON/XML only.

## Verification done

- `bun test src/utils/caveMode/*.test.ts src/services/tools/toolExecution.test.ts src/components/StartupScreen.test.ts src/components/StartupScreen.palettes.test.ts`
- `bun test src/services/tools/toolHooks.test.ts`
- `bun test scripts/missing-module-stub.test.ts`
- `bun test tests/sdk/package-consumer-types.test.ts`
- `bun run smoke`

## Known limitations

- `bun run typecheck` does not pass on this checkout because repo already has many unrelated TypeScript errors outside this diff.
- Full `bun test` was not left as a clean proof target because some tests require prior build artifacts; targeted affected checks and `smoke` passed after build.
- UI reskin is header/startup/theme focused. Layout/behavior intentionally preserved.

## Suggested next steps

1. Run manual UX pass inside terminal on startup screen, header, and message chrome.
2. Add deeper integration coverage around mapped tool result objects beyond current helper-level coverage.
3. If desired, expand Cave Mode settings to user-facing docs/config docs.
4. If desired, tune more REPL surfaces to match Caveman blue reference exactly.
