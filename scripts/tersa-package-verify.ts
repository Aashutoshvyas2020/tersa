import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { arch, platform, release, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

type PackJsonEntry = {
  filename: string
  files?: Array<{ path: string }>
}

export function buildPackInstallVerificationPlan(version: string): string[] {
  return [
    'bun run verify:tersa:release',
    'npm pack --dry-run --json',
    'npm pack',
    `npm install -g ./tersa-cli-${version}.tgz`,
    'tersa --version',
    'tersa --help',
    'bun run scripts/tersa-tui-canary.ts --binary tersa',
  ]
}

export function buildNpmDryRunVerificationPlan(): string[] {
  return [
    'bun run build',
    'npm pack --dry-run --json',
    'npm pack --json',
    'npm install -g ./tersa-cli-<version>.tgz',
    'tersa --version',
    'tersa --help',
    'bun run scripts/tersa-tui-canary.ts --binary tersa',
  ]
}

export function buildPlatformSmokeVerificationPlan(): string[] {
  return [
    'bun run build',
    'npm pack --dry-run --json',
    'npm pack --json',
    'npm install -g ./tersa-cli-<version>.tgz',
    'tersa --version',
    'tersa --help',
  ]
}

export function validatePackFilename(fileName: string): { ok: boolean; error?: string } {
  const ok = /^tersa-cli-\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\.tgz$/.test(fileName)
  return ok ? { ok } : { ok, error: `Unexpected tarball name: ${fileName}` }
}

export function parsePackJsonOutput(output: string): PackJsonEntry[] {
  const start = output.indexOf('[\n')
  const fallbackStart = output.indexOf('[{')
  const jsonStart = start >= 0 ? start : fallbackStart
  if (jsonStart < 0) {
    throw new Error('npm pack did not emit a JSON payload')
  }
  return JSON.parse(output.slice(jsonStart)) as PackJsonEntry[]
}

function packedPaths(entries: PackJsonEntry[]): Set<string> {
  return new Set(entries.flatMap(entry => entry.files?.map(file => file.path) ?? []))
}

export function findPackedForbiddenFiles(
  entries: PackJsonEntry[],
  forbiddenPaths: string[],
): string[] {
  const packed = packedPaths(entries)
  return forbiddenPaths.filter(path => packed.has(path))
}

export function findMissingPackedFiles(
  entries: PackJsonEntry[],
  requiredPaths: string[],
): string[] {
  const packed = packedPaths(entries)
  return requiredPaths.filter(path => !packed.has(path))
}

const FORBIDDEN_PACKED_PATHS = ['bin/import-specifier.test.mjs']
const REQUIRED_PACKED_PATHS = [
  'src/entrypoints/sdk.d.ts',
  'src/entrypoints/sdk/coreTypes.generated.ts',
]

function verifyPackedContents(entries: PackJsonEntry[]): void {
  const forbidden = findPackedForbiddenFiles(entries, FORBIDDEN_PACKED_PATHS)
  if (forbidden.length > 0) {
    throw new Error(`Forbidden files in npm package: ${forbidden.join(', ')}`)
  }

  const missing = findMissingPackedFiles(entries, REQUIRED_PACKED_PATHS)
  if (missing.length > 0) {
    throw new Error(`Required files missing from npm package: ${missing.join(', ')}`)
  }
}

function run(command: string, cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync(command, {
    cwd,
    env,
    encoding: 'utf8',
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status ?? result.signal ?? 'unknown'}): ${command}`,
    )
  }
  return result.stdout ?? ''
}

function runExecutable(
  executable: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status ?? result.signal ?? 'unknown'}): ${executable} ${args.join(' ')}`,
    )
  }
  return result.stdout ?? ''
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function packTarball(cwd: string): string {
  const json = run('npm pack --json', cwd)
  const parsed = parsePackJsonOutput(json)
  const filename = parsed[0]?.filename
  if (!filename) {
    throw new Error('npm pack did not return a tarball filename')
  }
  const validation = validatePackFilename(filename)
  if (!validation.ok) {
    throw new Error(validation.error)
  }
  return filename
}

export function resolveInstalledBin(
  prefix: string,
  platformName: NodeJS.Platform = process.platform,
): string {
  return platformName === 'win32'
    ? resolve(prefix, 'tersa.cmd')
    : resolve(prefix, 'bin', 'tersa')
}

function verifyInstalledTarball(
  cwd: string,
  tarball: string,
  runInteractiveCanary = true,
): void {
  const prefix = mkdtempSync(join(tmpdir(), 'tersa-pack-'))
  const env = { ...process.env, npm_config_prefix: prefix }

  try {
    const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const bunExecutable = process.platform === 'win32' ? 'bun.exe' : 'bun'
    runExecutable(npmExecutable, ['install', '-g', `./${tarball}`], cwd, env)
    const bin = resolveInstalledBin(prefix)
    runExecutable(bin, ['--version'], cwd, env)
    runExecutable(bin, ['--help'], cwd, env)
    if (runInteractiveCanary) {
      runExecutable(
        bunExecutable,
        ['run', 'scripts/tersa-tui-canary.ts', '--binary', bin],
        cwd,
        env,
      )
    }
  } finally {
    rmSync(prefix, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const cwd = process.cwd()
  const npmDryRun = process.argv.includes('--npm-dry-run')
  const platformSmoke = process.argv.includes('--platform-smoke')
  const version = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')).version as string

  if (platformSmoke) {
    run('bun run build', cwd)
    const dryRun = parsePackJsonOutput(run('npm pack --dry-run --json', cwd))
    verifyPackedContents(dryRun)
    const tarball = packTarball(cwd)
    try {
      verifyInstalledTarball(cwd, tarball, false)
      console.log(`PASS: platform package smoke verified (${tarball})`)
    } finally {
      rmSync(resolve(cwd, tarball), { force: true })
    }
    process.exit(0)
  }

  if (npmDryRun) {
    run('bun run build', cwd)
    const dryRun = parsePackJsonOutput(run('npm pack --dry-run --json', cwd))
    verifyPackedContents(dryRun)
    const tarball = packTarball(cwd)
    try {
      verifyInstalledTarball(cwd, tarball)
      console.log(`PASS: npm dry-run package verified (${tarball})`)
    } finally {
      rmSync(resolve(cwd, tarball), { force: true })
    }
    process.exit(0)
  }

  const commit = run('git rev-parse HEAD', cwd).trim()
  const bunVersion = run('bun --version', cwd).trim()
  run('bun run verify:tersa:release', cwd)
  const dryRun = parsePackJsonOutput(run('npm pack --dry-run --json', cwd))
  verifyPackedContents(dryRun)
  const tarball = packTarball(cwd)

  verifyInstalledTarball(cwd, tarball)
  const artifactDir = join(tmpdir(), `tersa-tester-${commit.slice(0, 8)}`)
  rmSync(artifactDir, { recursive: true, force: true })
  mkdirSync(artifactDir, { recursive: true })
  const artifactTarball = join(artifactDir, tarball)
  renameSync(resolve(cwd, tarball), artifactTarball)
  const checksum = sha256(artifactTarball)
  writeFileSync(
    join(artifactDir, 'README-TESTERS.md'),
    `# Tersa Tester Build

Version: ${version}
Commit: ${commit}

Verified environment:

- OS: ${platform()} ${release()} ${arch()}
- Node: ${process.version}
- Bun: ${bunVersion}
- Provider profile: OpenAI-compatible route
- Verified model: gpt-5.4-mini
- Reasoning effort: high
- Automatic fallback: disabled for tester validation

## Install

\`\`\`bash
npm install -g ./${tarball}
tersa
\`\`\`

Windows users should run the same npm commands from PowerShell after installing Node ${process.version} or a compatible supported Node version.

## Health Checks

\`\`\`bash
tersa --version
tersa --help
tersa
/doctor
\`\`\`

## TUI Canary

The tester package gate runs the complete PTY interaction canary against the installed binary. To run the same canary manually:

\`\`\`bash
bun run test:tersa:interactive -- --binary tersa
\`\`\`

## Provider Setup

Configure an OpenAI-compatible provider with access to \`gpt-5.4-mini\`. Tester validation used \`gpt-5.4-mini\` with high reasoning effort only. Do not assume other providers or models are verified by this package.

## Update Or Uninstall

\`\`\`bash
npm install -g ./tersa-cli-<new-version>.tgz
npm uninstall -g tersa
\`\`\`

## Bug Reports

Include the Tersa version, commit SHA, OS, Node version, Bun version if used, terminal app, command run, and a short reproduction. Do not include API keys, OAuth tokens, private code, proprietary logs, or credentials.
`,
  )
  writeFileSync(
    join(artifactDir, 'KNOWN-LIMITS.md'),
    `# Known Limits

- This is a tester build, not a final stable release.
- Provider credentials are required for real model use.
- The only verified model for this package is \`gpt-5.4-mini\` with high reasoning effort.
- The package was verified on ${platform()} ${release()} ${arch()} only.
- Some usage and token counters may be estimated depending on provider support.
- OAuth behavior can vary by provider account and local credential state.
- Packaging runs the complete PTY interaction canary against the installed tarball.
- No Tersa tests remain quarantined in this tester build.
`,
  )
  writeFileSync(
    join(artifactDir, 'CHECKSUMS.txt'),
    `${checksum}  ${tarball}\n`,
  )
  console.log(`PASS: tester package verified (${tarball})`)
  console.log(`Artifact: ${artifactDir}`)
  console.log(`Checksum: ${checksum}`)
}
