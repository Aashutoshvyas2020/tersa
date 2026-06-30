import { expect, test } from 'bun:test'
import { classifyOpenAIHttpFailure } from './openaiErrorClassification.js'

test('hard plan usage limits are non-retryable', () => {
  const failure = classifyOpenAIHttpFailure({
    status: 429,
    body: JSON.stringify({
      error: { code: 'usage_limit_reached', message: 'Usage limit reached' },
      plan_type: 'plus',
      reset_after_seconds: 7200,
    }),
  })

  expect(failure.category).toBe('quota')
  expect(failure.retryable).toBe(false)
})

test('ordinary 429 responses remain retryable', () => {
  const failure = classifyOpenAIHttpFailure({
    status: 429,
    body: 'Too many requests',
  })

  expect(failure.category).toBe('rate_limited')
  expect(failure.retryable).toBe(true)
})
