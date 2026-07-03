import { describe, expect, test } from 'bun:test'

import {
  parseCliSmokeTarget,
  validateHelpOutput,
  validateVersionOutput,
} from './tersa-cli-smoke.ts'

describe('tersa cli smoke validators', () => {
  test('ignores a literal argument separator before the executable', () => {
    expect(parseCliSmokeTarget(['--', 'node', 'dist/cli.mjs'])).toEqual({
      runner: 'node',
      entryArgs: ['dist/cli.mjs'],
    })
  })

  test('accept tersa-branded version output', () => {
    const result = validateVersionOutput('0.16.1 (Tersa)')
    expect(result).toEqual({ ok: true, errors: [] })
  })

  test('reject legacy branding in version output', () => {
    const result = validateVersionOutput('0.16.1 (Caveman)')
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('missing expected brand "Tersa"')
    expect(result.errors).toContain('contains forbidden branding "caveman"')
  })

  test('accept tersa help output', () => {
    const result = validateHelpOutput('Usage: tersa [options]\nRun tersa --help')
    expect(result).toEqual({ ok: true, errors: [] })
  })

  test('reject forbidden help branding', () => {
    const result = validateHelpOutput(
      'Usage: tersa [options]\nTersa with Caveman Code theme',
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('contains forbidden branding "caveman code"')
  })
})
