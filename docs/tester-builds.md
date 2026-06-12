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

## Install A Tarball

```bash
npm install -g ./tersa-<version>.tgz
tersa --version
tersa --help
tersa
```

## Verification Commands

```bash
bun run verify:tersa:dev
bun run verify:tersa:interactive
bun run verify:tersa:release
bun run test:tersa:quarantined
bun run doctor:runtime
bun run smoke:tersa
```

Release verification uses `typecheck:tersa:baseline` for TypeScript. Current
repo-wide TypeScript debt is recorded in `scripts/tersa-typecheck-baseline.json`;
new TypeScript error signatures fail the gate.

`test:tersa:quarantined` tracks excluded tests that are not counted in the
current release gate. Treat failures there as open release debt, not as passing
coverage.

Current quarantine list:

- `src/utils/caveMode/toolCompression.test.ts`: previously failed under shared
  Cave Mode env/settings state; kept tracked until isolation is proven stable.
- `src/utils/caveMode/queryPipeline.test.ts`: previously failed under shared
  Cave Mode env/settings state; kept tracked until isolation is proven stable.
- `src/utils/caveMode/rtkRewrite.test.ts`: previously failed under shared
  Cave Mode env/settings state; kept tracked until isolation is proven stable.
- `src/services/tools/toolExecution.test.ts`: previously failed through Cave
  Mode integration state; kept tracked until isolation is proven stable.

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

The packaged artifact smoke currently runs a startup-only PTY canary. The full
interactive command is intended to drive `/help`, `/model`, `/modes`,
`/statusline`, `/permissions`, and `/status`, but that flow still needs hard
verification before it can be treated as a complete TUI gate.

Default scripted profile:

- provider family: codex-style OpenAI route
- model: `gpt-5.4-mini`
- effort: `high`

## Known Limits

- Real provider credentials are still required for full interactive testing.
- Some usage and token counters remain estimated on certain providers.
- The PTY canary defaults to `gpt-5.4-mini` with `high` effort semantics.
