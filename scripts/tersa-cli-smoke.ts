import { spawnSync } from 'node:child_process'
import { stripVTControlCharacters } from 'node:util'

import { DEFAULT_FORBIDDEN_BRANDING_PATTERNS } from './tersa-branding-audit.ts'

export type CliSmokeCheck = {
  ok: boolean
  errors: string[]
}

export type CliSmokeResult = {
  version: CliSmokeCheck & { output: string }
  help: CliSmokeCheck & { output: string }
}

function normalizeOutput(output: string): string {
  return stripVTControlCharacters(output).replace(/\r\n/g, '\n').trim()
}

function detectForbiddenBranding(text: string): string[] {
  return DEFAULT_FORBIDDEN_BRANDING_PATTERNS
    .filter(pattern => pattern.regex.test(text))
    .map(pattern => pattern.label)
}

export function validateVersionOutput(
  output: string,
  expectedBrand = 'Tersa',
): CliSmokeCheck {
  const normalized = normalizeOutput(output)
  const errors: string[] = []

  if (!new RegExp(`\\b${expectedBrand}\\b`, 'i').test(normalized)) {
    errors.push(`missing expected brand "${expectedBrand}"`)
  }

  for (const branding of detectForbiddenBranding(normalized)) {
    errors.push(`contains forbidden branding "${branding}"`)
  }

  return { ok: errors.length === 0, errors }
}

export function validateHelpOutput(
  output: string,
  expectedCommand = 'tersa',
): CliSmokeCheck {
  const normalized = normalizeOutput(output)
  const errors: string[] = []

  if (!new RegExp(`\\b${expectedCommand}\\b`, 'i').test(normalized)) {
    errors.push(`missing expected command "${expectedCommand}"`)
  }

  for (const branding of detectForbiddenBranding(normalized)) {
    errors.push(`contains forbidden branding "${branding}"`)
  }

  return { ok: errors.length === 0, errors }
}

export function runCliSmoke(
  runner: string,
  entryArgs: string[],
): CliSmokeResult {
  const versionProc = spawnSync(runner, [...entryArgs, '--version'], {
    encoding: 'utf8',
  })
  const helpProc = spawnSync(runner, [...entryArgs, '--help'], {
    encoding: 'utf8',
  })

  const versionOutput = `${versionProc.stdout ?? ''}${versionProc.stderr ?? ''}`
  const helpOutput = `${helpProc.stdout ?? ''}${helpProc.stderr ?? ''}`

  return {
    version: {
      ...validateVersionOutput(versionOutput),
      output: normalizeOutput(versionOutput),
    },
    help: {
      ...validateHelpOutput(helpOutput),
      output: normalizeOutput(helpOutput),
    },
  }
}

if (import.meta.main) {
  const target = process.argv.slice(2)
  if (target.length === 0) {
    console.error('Usage: bun run scripts/tersa-cli-smoke.ts -- <runner> <entry> [args...]')
    process.exit(1)
  }

  const [runner, ...entryArgs] = target
  const result = runCliSmoke(runner, entryArgs)
  const failures = [
    ...result.version.errors.map(error => `version: ${error}`),
    ...result.help.errors.map(error => `help: ${error}`),
  ]

  if (failures.length === 0) {
    console.log('PASS: tersa CLI smoke checks passed')
    process.exit(0)
  }

  console.error(failures.join('\n'))
  process.exit(1)
}
