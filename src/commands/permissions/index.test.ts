import { describe, expect, test } from 'bun:test'

import permissions from './index.js'

describe('/permissions command', () => {
  test('registers as local-jsx command', () => {
    expect(permissions.name).toBe('permissions')
    expect(permissions.type).toBe('local-jsx')
    expect(permissions.description).toContain('permission')
  })
})
