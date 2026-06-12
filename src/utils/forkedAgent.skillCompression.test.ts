import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

const getCaveModeConfig = mock(() => ({
  skillPromptCompression: true,
  skillPromptCompressionStyle: 'wenyan-full',
}))

mock.module('./caveMode/config.js', () => ({
  getCaveModeConfig,
}))

describe('prepareForkedCommandContext skill compression', () => {
  beforeEach(() => {
    getCaveModeConfig.mockClear()
  })

  afterAll(() => {
    mock.restore()
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
