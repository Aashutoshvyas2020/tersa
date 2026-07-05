import { describe, expect, test } from 'bun:test'

import { shouldConsumeUnboundBinding } from './useKeybinding.js'

describe('useKeybinding unbound propagation', () => {
  test('standalone unbound keys fall through to later input handlers', () => {
    expect(shouldConsumeUnboundBinding()).toBe(false)
  })
})
