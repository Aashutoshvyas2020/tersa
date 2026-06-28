import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

export const RELEASE_GATE_STEPS = [
  'bun run build',
  'bun run typecheck:tersa:baseline',
  'bun run smoke:tersa',
  'bun run doctor:runtime',
  'bun run audit:branding:tersa',
  'bun run audit:release:tersa',
  'bun run benchmark:tokens:tersa',
  'bun run test:tersa',
  'bun run test:tersa:quarantined',
] as const

const DEV_GATE_STEPS = [
  'bun run build',
  'bun run smoke:tersa',
  'bun run test:tersa:focused',
] as const

const INTERACTIVE_GATE_STEPS = [
  'bun run test:tersa:interactive',
] as const

const LEGACY_OPEN_PRODUCT = ['open', 'claude'].join('')
const LEGACY_SCOPED_PACKAGE = ['@gitlawb/', LEGACY_OPEN_PRODUCT].join('')
const REMOVED_DRIFT_WARNING = String.fromCharCode(115, 101, 115, 115, 105, 111, 110, 32, 100, 114, 105, 102, 116, 32, 100, 101, 116, 101, 99, 116, 101, 100)

const RELEASE_SURFACE_FORBIDDEN = [
  LEGACY_OPEN_PRODUCT,
  ['open', 'claude'].join(' '),
  'browser connector',
  'chrome connector',
  REMOVED_DRIFT_WARNING,
  LEGACY_SCOPED_PACKAGE,
] as const

const DEFAULT_RELEASE_SURFACE_FILES = [
  'README.md',
  'package.json',
  'docs/tester-builds.md',
  'src/entrypoints/cli.tsx',
  'src/components/LogoV2',
  'src/components/StartupScreen.ts',
  'src/services/notifier.ts',
  'bin',
] as const

export type ReleaseSurfaceValidation = {
  ok: boolean
  violations: string[]
}

export function validateReleaseSurfaceText(text: string): ReleaseSurfaceValidation {
  const lower = text.toLowerCase()
  const violations = RELEASE_SURFACE_FORBIDDEN.filter(pattern =>
    lower.includes(pattern),
  )
  return { ok: violations.length === 0, violations: [...violations] }
}

export function buildReleaseGatePlan() {
  return {
    dev: { name: 'dev', commands: [...DEV_GATE_STEPS] },
    interactive: { name: 'interactive', commands: [...INTERACTIVE_GATE_STEPS] },
    release: { name: 'release', commands: [...RELEASE_GATE_STEPS] },
  }
}

function collectFiles(baseDir: string, relativePath: string): string[] {
  const absolutePath = resolve(baseDir, relativePath)
  const stats = statSync(absolutePath)
  if (stats.isFile()) {
    return [absolutePath]
  }

  const files: string[] = []
  for (const entry of readdirSync(absolutePath)) {
    files.push(...collectFiles(baseDir, join(relativePath, entry)))
  }
  return files
}

export function auditReleaseSurfaces(
  baseDir = process.cwd(),
  relativePaths: readonly string[] = DEFAULT_RELEASE_SURFACE_FILES,
): ReleaseSurfaceValidation {
  const violations = new Set<string>()
  const textPattern = /\.(md|txt|json|js|jsx|ts|tsx|mjs|cjs|html|css|yml|yaml|svg|proto)$/i

  for (const relativePath of relativePaths) {
    for (const filePath of collectFiles(baseDir, relativePath)) {
      if (!textPattern.test(filePath)) continue
      const content = `${relative(baseDir, filePath)}\n${readFileSync(filePath, 'utf8')}`
      for (const violation of validateReleaseSurfaceText(content).violations) {
        violations.add(violation)
      }
    }
  }

  return { ok: violations.size === 0, violations: [...violations].sort() }
}

function runCommand(command: string, cwd: string): void {
  const result = spawnSync('bash', ['-lc', command], {
    cwd,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (import.meta.main) {
  const tier = (process.argv[2] ?? 'release') as 'dev' | 'interactive' | 'release' | 'audit'
  if (tier === 'audit') {
    const result = auditReleaseSurfaces()
    if (result.ok) {
      console.log('PASS: release surfaces are clean')
      process.exit(0)
    }
    console.error(`FAIL: forbidden release surface strings: ${result.violations.join(', ')}`)
    process.exit(1)
  }

  const plan = buildReleaseGatePlan()
  for (const command of plan[tier].commands) {
    runCommand(command, process.cwd())
  }
}
