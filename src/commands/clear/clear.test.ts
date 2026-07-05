import { expect, mock, test } from 'bun:test'

let cleared = false
mock.module('./conversation.js', () => ({
  clearConversation: async () => {
    cleared = true
  },
}))

test('clear suppresses the empty command result', async () => {
  const { call } = await import('./clear.js')
  const result = await call('', {} as never)

  expect(cleared).toBe(true)
  expect(result).toEqual({ type: 'text', value: '', display: 'skip' })
})
