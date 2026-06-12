import { describe, expect, test } from 'bun:test'
import statusline from './statusline.js'

describe('/statusline command', () => {
  test('opens as a local UI command', async () => {
    expect(statusline.type).toBe('local-jsx')
    if (statusline.type !== 'local-jsx') {
      throw new Error('statusline must stay a local-jsx command')
    }

    expect(statusline.name).toBe('statusline')
    expect(statusline.description).toContain('status line')
  })
})
