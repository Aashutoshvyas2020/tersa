import { describe, expect, test } from 'bun:test'
import { resolveTabTitle } from './Tabs.js'

describe('resolveTabTitle', () => {
  test('uses a compact label at 60 columns', () => {
    expect(resolveTabTitle('Recently denied', 'Denied', 60)).toBe('Denied')
  })

  test('keeps the full label at wider widths', () => {
    expect(resolveTabTitle('Recently denied', 'Denied', 80)).toBe(
      'Recently denied',
    )
  })

  test('keeps the full label when no compact label is provided', () => {
    expect(resolveTabTitle('Allow', undefined, 60)).toBe('Allow')
  })
})
