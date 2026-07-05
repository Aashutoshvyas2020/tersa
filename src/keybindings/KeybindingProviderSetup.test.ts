import { describe, expect, test } from 'bun:test'

import { shouldConsumeUnboundKey } from './KeybindingProviderSetup.js'

describe('ChordInterceptor unbound keys', () => {
  test('lets standalone unbound keys reach the active input control', () => {
    expect(shouldConsumeUnboundKey(false)).toBe(false)
  })

  test('consumes an unbound key when it cancels a pending chord', () => {
    expect(shouldConsumeUnboundKey(true)).toBe(true)
  })
})
