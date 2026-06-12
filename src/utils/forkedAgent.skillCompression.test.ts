import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DEFAULT_CAVE_MODE_CONFIG } from './caveMode/config.js'
import {
  resetSettingsCache,
  setSessionSettingsCache,
} from './settings/settingsCache.js'

describe('prepareForkedCommandContext skill compression', () => {
  beforeEach(() => {
    const caveMode = {
      ...DEFAULT_CAVE_MODE_CONFIG,
    }
    caveMode.skillPromptCompressionStyle = 'wenyan-full'
    setSessionSettingsCache({
      settings: {
        caveMode,
      },
      errors: [],
    })
  })

  afterEach(() => {
    resetSettingsCache()
  })

  test('compresses skill text before prompt message creation', async () => {
    const { prepareForkedCommandContext } = await import('./forkedAgent.js')

    const result = await prepareForkedCommandContext(
      {
        name: 'demo',
        type: 'prompt',
        getPromptForCommand: async () => [
          {
            type: 'text',
            text: 'Assumptions explicit. If ambiguity changes implementation, ask instead of guessing.',
          },
        ],
      } as never,
      '',
      {
        getAppState: () => ({ toolPermissionContext: {} }),
        options: {
          agentDefinitions: {
            activeAgents: [{ agentType: 'general-purpose' }],
          },
        },
      } as never,
    )

    expect(result.skillContent).toContain('先明所假')
    expect(result.promptMessages[0]?.message.content).toBe(result.skillContent)
  })
})
