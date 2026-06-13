import { describe, expect, test } from 'bun:test'

import {
  assertScreen,
  assertStableScreen,
  normalizeScreenSnapshot,
} from './tersa-tui-canary.ts'

describe('tersa tui canary helpers', () => {
  test('normalizes ansi snapshots into stable text blocks', () => {
    const normalized = normalizeScreenSnapshot(
      '\u001b[2J\u001b[Htersa\r\nstatus\r\nstatus\r\n',
    )

    expect(normalized.lines).toEqual(['tersa', 'status', 'status'])
    expect(normalized.text).toBe('tersa\nstatus\nstatus')
  })

  test('flags duplicate rows and forbidden legacy branding', () => {
    const result = assertStableScreen(
      normalizeScreenSnapshot(
        'OpenClaude\nsame row\nsame row\nbrowser connector\n',
      ),
      { width: 80 },
    )

    expect(result.ok).toBe(false)
    expect(result.errors.some(error => error.includes('duplicate row'))).toBe(true)
    expect(result.errors.some(error => error.includes('openclaude'))).toBe(true)
    expect(result.errors.some(error => error.includes('browser connector'))).toBe(true)
  })

  test('flags leaked hidden session canary markers', () => {
    const result = assertStableScreen(
      normalizeScreenSnapshot('visible <tersa-canary:7f2a> text\n'),
      { width: 80 },
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('hidden session canary marker leaked to screen')
  })

  test('ignores wide decorative box borders during width checks', () => {
    const result = assertStableScreen(
      normalizeScreenSnapshot(
        '╠════════════════════════════════════════════════════════════╣\nSession\n',
      ),
      { width: 60 },
    )

    expect(result.ok).toBe(true)
  })

  test('startup assertions accept lowercase dashed model rendering', () => {
    expect(() =>
      assertScreen(
        'Tersa\nModel gpt-5.4-mini\n',
        80,
        'startup',
        ['Tersa', '5.4', 'mini'],
      ),
    ).not.toThrow()
  })
})
