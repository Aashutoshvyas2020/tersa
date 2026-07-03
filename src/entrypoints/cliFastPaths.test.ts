import { describe, expect, test } from 'bun:test'

import { isHelpInvocation } from './cliFastPaths.ts'

describe('CLI fast paths', () => {
  test('recognizes root and command-specific help without matching normal prompts', () => {
    expect(isHelpInvocation(['--help'])).toBe(true)
    expect(isHelpInvocation(['-h'])).toBe(true)
    expect(isHelpInvocation(['auth', '--help'])).toBe(true)
    expect(isHelpInvocation(['help', 'auth'])).toBe(false)
    expect(isHelpInvocation(['explain', 'help'])).toBe(false)
  })
})
