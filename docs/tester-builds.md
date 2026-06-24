# Tester Builds

Tester builds ship as an npm tarball generated with `npm pack`.

## Build The Tester Artifact

```bash
bun run package:tersa:tester
```

That command runs:

1. `bun run verify:tersa:release`
2. `npm pack --dry-run`
3. `npm pack`
4. temp-prefix global install verification
5. packaged `tersa --version`
6. packaged `tersa --help`
7. packaged PTY startup canary
8. tester handoff bundle generation under `/tmp/tersa-tester-<sha>`

## Install A Tarball

```bash
npm install -g ./tersa-cli-<version>.tgz
tersa --version
tersa --help
tersa
```

## Verification Commands

```bash
bun run verify:tersa:dev
bun run verify:tersa:interactive
bun run verify:tersa:release
bun run release:npm:dry-run
bun run test:tersa:quarantined
bun run doctor:runtime
bun run smoke:tersa
```

Release verification uses `typecheck:tersa:baseline` for TypeScript. Current
repo-wide TypeScript debt is recorded in `scripts/tersa-typecheck-baseline.json`;
new TypeScript error signatures fail the gate.

`test:tersa:quarantined` is an explicit empty quarantine report for this tester
build. It must list every excluded test with path, owner, reproduction command,
reason, and removal condition if a future quarantine is added.

Current quarantine list:

- None.

## Public NPM Publish

Run the local package gate first:

```bash
bun run typecheck:tersa:baseline
bun run build
npm pack --dry-run --json
bun run package:tersa:tester
bun run release:npm:dry-run
```

First public publish:

```bash
npm login
npm publish --access public
```

After publish:

```bash
npm view tersa-cli version dist-tags bin engines
npm install -g tersa-cli@latest
tersa --version
tersa --help
tersa
```

Restored tests:

- `src/utils/caveMode/toolCompression.test.ts`
- `src/utils/caveMode/queryPipeline.test.ts`
- `src/utils/caveMode/rtkRewrite.test.ts`
- `src/services/tools/toolExecution.test.ts`

## Token Optimization Validation

```bash
bun run benchmark:tokens:tersa
```

The release benchmark checks:

- large Bash output compression
- repeated Read output reduction
- structured JSON and XML compression
- tool-history compression
- skill/internal prompt compression
- live transcript composition

## TUI Canary

```bash
bun run test:tersa:interactive
```

The full PTY canary is experimental and opt-in for now. It drives an interactive
menu flow:

- `/help`
- `/model`
- `/modes`
- `/statusline`
- `/permissions`
- `/status`
- normal prompt submission
- session drift warning: two misses stay quiet, third miss warns, Ignore and
  session suppression actions close the dialog correctly

Packaged verification runs the faster startup-only canary against the installed
`tersa` binary so tester packaging is not blocked by the full experimental flow:

```bash
bun run scripts/tersa-tui-canary.ts --startup-only --binary tersa
```

Default scripted profile:

- provider family: deterministic OpenAI-compatible fixture for the canary
- model: `gpt-5.4-mini`
- effort: `high`
- fallback: disabled

## Known Limits

- Real provider credentials are still required for full interactive testing.
- Some usage and token counters remain estimated on certain providers.
- The PTY canary validates `gpt-5.4-mini` with `high` effort only.
- The full-flow PTY canary is experimental and manual; packaging runs
  startup-only canary coverage by default.
- The tester package is verified only on environments explicitly listed in the
  generated handoff README.
