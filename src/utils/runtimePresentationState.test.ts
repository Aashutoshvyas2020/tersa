import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getRuntimePresentationState } from './runtimePresentationState.js'

const ENV_KEYS = [
  'CLAUDE_CODE_USE_OPENAI',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'CLAUDE_CODE_USE_GEMINI',
  'CLAUDE_CODE_USE_MISTRAL',
] as const

const previous: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    if (process.env[key] !== undefined) previous[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previous[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
    delete previous[key]
  }
})

describe('runtime presentation state', () => {
  test('derives provider, model, effort, and endpoint from one runtime state', () => {
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = 'https://chatgpt.com/backend-api/codex'
    process.env.OPENAI_MODEL = 'codexplan'

    expect(getRuntimePresentationState('codexplan', 'medium')).toEqual({
      provider: 'Codex',
      model: 'codexplan (gpt-5.5)',
      effort: 'medium',
      endpoint: 'https://chatgpt.com/backend-api/codex',
      isLocal: false,
    })
  })

  test('uses the default runtime model consistently when no override exists', () => {
    const state = getRuntimePresentationState(null, undefined)

    expect(state.provider).toBe('Anthropic')
    expect(state.model).toBeTruthy()
    expect(state.effort).toBeTruthy()
    expect(state.endpoint).toBe('https://api.anthropic.com/')
  })
})
