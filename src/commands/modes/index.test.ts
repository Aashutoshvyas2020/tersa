import { describe, expect, test } from 'bun:test'
import modes from './index.js'

describe('/modes command', () => {
  test('registers as local-jsx command', () => {
    expect(modes.name).toBe('modes')
    expect(modes.type).toBe('local-jsx')
    expect(modes.description).toContain('modes')
  })
})
