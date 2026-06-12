import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export function buildPackInstallVerificationPlan(version: string): string[] {
  return [
    'bun run verify:tersa:release',
    'npm pack --dry-run',
    'npm pack',
    `npm install -g ./tersa-${version}.tgz`,
    'tersa --version',
    'tersa --help',
    'bun run test:tersa:interactive -- --binary tersa',
  ]
}

export function validatePackFilename(fileName: string): { ok: boolean; error?: string } {
  const ok = /^tersa-\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\.tgz$/.test(fileName)
  return ok ? { ok } : { ok, error: `Unexpected tarball name: ${fileName}` }
}

export function parsePackJsonOutput(output: string): Array<{ filename: string }> {
  const start = output.indexOf('[\n')
  const fallbackStart = output.indexOf('[{')
  const jsonStart = start >= 0 ? start : fallbackStart
  if (jsonStart < 0) {
    throw new Error('npm pack did not emit a JSON payload')
  }
  return JSON.parse(output.slice(jsonStart)) as Array<{ filename: string }>
}

function run(command: string, cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync('bash', ['-lc', command], {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  return result.stdout ?? ''
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

if (import.meta.main) {
  const cwd = process.cwd()
  run('bun run verify:tersa:release', cwd)
  run('npm pack --dry-run', cwd)
  const tarball = packTarball(cwd)
  const prefix = mkdtempSync(join(tmpdir(), 'tersa-pack-'))
  const env = { ...process.env, npm_config_prefix: prefix }

  try {
    run(`npm install -g ./${tarball}`, cwd, env)
    const bin = resolve(prefix, 'bin', 'tersa')
    run(`${JSON.stringify(bin)} --version`, cwd, env)
    run(`${JSON.stringify(bin)} --help`, cwd, env)
    run(
      `bun run test:tersa:interactive -- --binary ${JSON.stringify(bin)} --startup-only`,
      cwd,
      env,
    )
    console.log(`PASS: tester package verified (${tarball})`)
  } finally {
    rmSync(prefix, { recursive: true, force: true })
  }
}
