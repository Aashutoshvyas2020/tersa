import { describe, expect, test } from 'bun:test'
import {
  getResponsiveWidth,
  getTerminalWidthBand,
  getVisibleRowBudget,
  shouldStackResponsiveRow,
} from './responsiveLayout.js'

describe('responsive TUI layout contract', () => {
  test('uses the approved terminal width bands', () => {
    expect(getTerminalWidthBand(39)).toBe('unsupported')
    expect(getTerminalWidthBand(40)).toBe('minimal')
    expect(getTerminalWidthBand(59)).toBe('minimal')
    expect(getTerminalWidthBand(60)).toBe('compact')
    expect(getTerminalWidthBand(79)).toBe('compact')
    expect(getTerminalWidthBand(80)).toBe('standard')
    expect(getTerminalWidthBand(109)).toBe('standard')
    expect(getTerminalWidthBand(110)).toBe('wide')
    expect(getTerminalWidthBand(120)).toBe('wide')
  })

  test('never exceeds the terminal, parent, or maximum width', () => {
    expect(
      getResponsiveWidth({ terminalWidth: 120, availableWidth: 80, maxWidth: 100 }),
    ).toBe(80)
    expect(
      getResponsiveWidth({
        terminalWidth: 80,
        availableWidth: 120,
        horizontalPadding: 4,
      }),
    ).toBe(76)
    expect(getResponsiveWidth({ terminalWidth: 40, maxWidth: 32 })).toBe(32)
  })

  test('stacks rows below the compact breakpoint', () => {
    expect(shouldStackResponsiveRow(40)).toBe(true)
    expect(shouldStackResponsiveRow(59)).toBe(true)
    expect(shouldStackResponsiveRow(60)).toBe(false)
  })

  test('reserves stable vertical space at short terminal heights', () => {
    expect(getVisibleRowBudget(20)).toBe(14)
    expect(getVisibleRowBudget(24)).toBe(18)
    expect(getVisibleRowBudget(34)).toBe(28)
    expect(getVisibleRowBudget(4)).toBe(1)
  })
})
