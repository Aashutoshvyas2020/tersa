import { describe, expect, test } from 'bun:test'
import {
  getProviderIntentTitle,
  getProviderPresetsForIntent,
} from './providerSetupIntent.js'

describe('provider setup intents', () => {
  test('keeps local providers out of the API-key list', () => {
    const apiProviders = getProviderPresetsForIntent('api-key')
    expect(apiProviders).not.toContain('ollama')
    expect(apiProviders).not.toContain('atomic-chat')
    expect(apiProviders).not.toContain('lmstudio')
    expect(apiProviders).not.toContain('custom')
    expect(apiProviders).toContain('openai')
    expect(apiProviders).toContain('anthropic')
  })

  test('limits the local path to local runtimes', () => {
    expect(getProviderPresetsForIntent('local')).toEqual([
      'lmstudio',
      'atomic-chat',
      'ollama',
    ])
  })

  test('keeps the complete preset inventory behind advanced setup', () => {
    const advanced = getProviderPresetsForIntent('advanced')
    expect(advanced).toContain('openai')
    expect(advanced).toContain('ollama')
    expect(advanced).toContain('custom')
    expect(advanced.length).toBeGreaterThan(20)
  })

  test('uses user-intent titles instead of provider taxonomy', () => {
    expect(getProviderIntentTitle('sign-in')).toBe('Sign in with an account')
    expect(getProviderIntentTitle('api-key')).toBe('Use an API key')
    expect(getProviderIntentTitle('local')).toBe('Connect a local model')
    expect(getProviderIntentTitle('advanced')).toBe('Advanced provider setup')
  })
})
