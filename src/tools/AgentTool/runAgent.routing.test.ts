import { describe, expect, test } from 'bun:test'
import { resolveAgentRunModelRouting } from '../../services/api/agentRouting.js'
import { getAgentModel } from '../../utils/model/agent.js'
import type { SettingsJson } from '../../utils/settings/types.js'

const routedSettings: SettingsJson = {
  agentModels: {
    'deepseek-grunt': {
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-test',
    },
  },
  agentRouting: {
    'general-purpose': 'deepseek-grunt',
  },
}

describe('runAgent provider routing', () => {
  test('resolves configured provider override for the child context model', () => {
    const resolvedAgentModel = getAgentModel(
      undefined,
      'parent-model',
      undefined,
      'default',
    )

    const result = resolveAgentRunModelRouting({
      resolvedAgentModel,
      subagentType: 'general-purpose',
      settings: routedSettings,
    })

    expect(result.mainLoopModel).toBe('deepseek-grunt')
    expect(result.providerOverride).toEqual({
      model: 'deepseek-grunt',
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test',
    })
  })

  test('does not add provider override for non-routed alias resolutions', () => {
    const result = resolveAgentRunModelRouting({
      resolvedAgentModel: 'claude-haiku-4-5-20251001',
      toolSpecifiedModel: 'haiku',
      subagentType: 'general-purpose',
      settings: {
        ...routedSettings,
        agentRouting: {},
      },
    })

    expect(result.mainLoopModel).toBe('claude-haiku-4-5-20251001')
    expect(result.providerOverride).toBeUndefined()
  })
})
