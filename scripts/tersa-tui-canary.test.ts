import { describe, expect, test } from 'bun:test'

import {
  assertScreen,
  assertStableScreen,
  chooseDialogCanaryWidth,
  isLiveProcessRow,
  normalizeScreenSnapshot,
  startupExpectationForWidth,
  terminalNegotiationSettleScript,
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
        'Tersa\nsame row\nsame row\nbrowser connector\n',
      ),
      { width: 80 },
    )

    expect(result.ok).toBe(false)
    expect(result.errors.some(error => error.includes('duplicate row'))).toBe(true)
    expect(result.errors.some(error => error.includes('tersa'))).toBe(false)
    expect(result.errors.some(error => error.includes('browser connector'))).toBe(true)
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

  test('chooses one representative width for dialog coverage', () => {
    expect(chooseDialogCanaryWidth([60, 80, 120])).toBe(80)
    expect(chooseDialogCanaryWidth([50, 100])).toBe(100)
    expect(chooseDialogCanaryWidth([60])).toBe(60)
  })

  test('uses the always-visible effort marker for responsive startup layouts', () => {
    expect(startupExpectationForWidth(60)).toEqual({
      expect: '[Hh]igh',
      regex: true,
    })
    expect(startupExpectationForWidth(80)).toEqual({
      expect: '[Hh]igh',
      regex: true,
    })
    expect(startupExpectationForWidth(120)).toEqual({
      expect: '[Hh]igh',
      regex: true,
    })
  })

  test('settles startup while answering terminal capability queries', () => {
    const script = terminalNegotiationSettleScript(5)

    expect(script).toContain('set timeout 5')
    expect(script).toContain('exp_continue -continue_timer')
    expect(script).toContain('set timeout 10')
  })

  test('does not treat zombie or exiting process rows as live leaks', () => {
    expect(isLiveProcessRow('123 1 Z+ inactive')).toBe(false)
    expect(isLiveProcessRow('124 1 ?E inactive')).toBe(false)
    expect(isLiveProcessRow('125 1 S+ active')).toBe(true)
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
