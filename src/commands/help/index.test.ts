import { describe, expect, test } from 'bun:test'

import help from './index.js'

describe('/help command', () => {
  test('registers as local-jsx command', () => {
    expect(help.name).toBe('help')
    expect(help.type).toBe('local-jsx')
    expect(help.description).toContain('help')
  })
})
