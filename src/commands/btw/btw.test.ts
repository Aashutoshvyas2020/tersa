import { expect, test } from 'bun:test'
import { BTW_USAGE, call } from './btw.js'

test('btw help explains syntax, purpose, example, and dismissal', async () => {
  const results: Array<{ message?: string; display?: string }> = []

  const output = await call(
    (message, options) => {
      results.push({ message, display: options?.display })
    },
    {} as never,
    '',
  )

  expect(output).toBeNull()
  expect(results).toEqual([{ message: BTW_USAGE, display: 'system' }])
  expect(BTW_USAGE).toContain('/btw your question')
  expect(BTW_USAGE).not.toContain('<question>')
  expect(BTW_USAGE).toContain('/btw what does this error message mean?')
  expect(BTW_USAGE).toContain('without steering or interrupting the main task')
  expect(BTW_USAGE).toContain('Press Space, Enter, or Escape')
})
