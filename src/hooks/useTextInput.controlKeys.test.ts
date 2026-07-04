import { describe, expect, test } from 'bun:test'

import { normalizeMappedInput } from './useTextInput.js'

describe('useTextInput control-key normalization', () => {
  test('maps raw PTY control bytes to their letter bindings', () => {
    expect(normalizeMappedInput('\x01')).toBe('a')
    expect(normalizeMappedInput('\x03')).toBe('c')
    expect(normalizeMappedInput('\x05')).toBe('e')
    expect(normalizeMappedInput('\x17')).toBe('w')
    expect(normalizeMappedInput('\x18')).toBe('x')
  })

  test('leaves printable and multi-character input unchanged', () => {
    expect(normalizeMappedInput('a')).toBe('a')
    expect(normalizeMappedInput('hello')).toBe('hello')
    expect(normalizeMappedInput('\x1b[A')).toBe('\x1b[A')
  })
})
