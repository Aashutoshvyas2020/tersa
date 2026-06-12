import { describe, expect, test } from 'bun:test'

import {
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
})
