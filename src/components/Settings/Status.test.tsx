import { afterEach, describe, expect, test } from 'bun:test'
import {
  buildStatusRuntimeProperties,
  isDuplicateRuntimeProperty,
} from './Status.js'

const previous = {
  useOpenAI: process.env.CLAUDE_CODE_USE_OPENAI,
  baseUrl: process.env.OPENAI_BASE_URL,
  model: process.env.OPENAI_MODEL,
}

afterEach(() => {
  if (previous.useOpenAI === undefined) delete process.env.CLAUDE_CODE_USE_OPENAI
  else process.env.CLAUDE_CODE_USE_OPENAI = previous.useOpenAI
  if (previous.baseUrl === undefined) delete process.env.OPENAI_BASE_URL
  else process.env.OPENAI_BASE_URL = previous.baseUrl
  if (previous.model === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = previous.model
})

describe('/status runtime identity', () => {
  test('renders provider, model, effort, and endpoint exactly once', () => {
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL =
      'https://user:secret@example.test/v1?api_key=hidden'
    process.env.OPENAI_MODEL = 'gpt-5.4-mini'

    const properties = buildStatusRuntimeProperties('gpt-5.4-mini', 'high')

    expect(properties.map(property => property.label)).toEqual([
      'Provider',
      'Model',
      'Effort',
      'Endpoint',
    ])
    expect(String(properties[3]?.value)).not.toContain('secret')
    expect(String(properties[3]?.value)).not.toContain('hidden')
  })

  test('filters transport-derived identity rows that would contradict runtime state', () => {
    expect(isDuplicateRuntimeProperty({ label: 'API provider', value: 'OpenAI' })).toBe(true)
    expect(isDuplicateRuntimeProperty({ label: 'Model', value: 'stale-model' })).toBe(true)
    expect(
      isDuplicateRuntimeProperty({ label: 'OpenAI base URL', value: 'https://example.test' }),
    ).toBe(true)
    expect(isDuplicateRuntimeProperty({ label: 'Proxy', value: 'configured' })).toBe(false)
  })
})
