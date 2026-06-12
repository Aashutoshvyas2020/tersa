import { describe, expect, test } from 'bun:test'

import status from './index.js'

describe('/status command', () => {
  test('registers as local-jsx command', () => {
    expect(status.name).toBe('status')
    expect(status.type).toBe('local-jsx')
    expect(status.description).toContain('status')
  })
})
