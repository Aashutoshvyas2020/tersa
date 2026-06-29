import { expect, test } from 'bun:test'
import { formatProviderQuotaMessage } from './errors.js'

test('formats plan quota details without retry advice', () => {
  const message = formatProviderQuotaMessage(
    JSON.stringify({ plan_type: 'plus', reset_after_seconds: 13_320 }),
    'Codex',
  )

  expect(message).toBe(
    'Usage limit reached\nResets in 3h 42m\nProvider: Codex\nPlan: Plus',
  )
})
