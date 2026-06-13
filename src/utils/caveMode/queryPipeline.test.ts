import { describe, expect, test } from 'bun:test'
import { createFileStateCacheWithSizeLimit } from '../fileStateCache.js'
import type { ToolUseContext } from '../../Tool.js'
import { DEFAULT_CAVE_MODE_CONFIG } from './config.js'
import {
  resetSettingsCache,
  setSessionSettingsCache,
} from '../settings/settingsCache.js'
import {
  applyCaveQueryOptimizations,
  buildMemoryRecallSummary,
  buildRepoMapSummary,
} from './queryPipeline.js'

function createToolUseContext(): ToolUseContext {
  return {
    abortController: new AbortController(),
    readFileState: createFileStateCacheWithSizeLimit(32),
    options: {
      commands: [],
      debug: false,
      mainLoopModel: 'gpt-4o',
      tools: [],
      verbose: false,
      thinkingConfig: { type: 'disabled' },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: false,
      agentDefinitions: {
        activeAgents: [],
        allAgents: [],
      },
    },
    getAppState: () =>
      ({
        toolPermissionContext: { mode: 'default' },
        mcp: { clients: [], tools: [] },
      }) as never,
    setAppState: () => {},
    messages: [],
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
  } as unknown as ToolUseContext
}

function buildConversation(exchanges: number, resultSize = 5000) {
  const messages: Array<{
    type: 'user' | 'assistant'
    message: { role: 'user' | 'assistant'; content: unknown; id?: string }
    uuid: string
    timestamp: string
  }> = [
    {
      type: 'user',
      message: { role: 'user', content: 'Investigate build issue' },
      uuid: 'u-0',
      timestamp: new Date().toISOString(),
    },
  ]

  for (let i = 0; i < exchanges; i++) {
    messages.push({
      type: 'assistant',
      message: {
        role: 'assistant',
        id: `a-${i}`,
        content: [
          {
            type: 'tool_use',
            id: `tool-${i}`,
            name: 'Read',
            input: { file_path: `/repo/src/file-${i}.ts` },
          },
        ],
      },
      uuid: `a-${i}`,
      timestamp: new Date().toISOString(),
    })
    messages.push({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: `tool-${i}`,
            content: 'x'.repeat(resultSize),
          },
        ],
      },
      uuid: `r-${i}`,
      timestamp: new Date().toISOString(),
    })
  }

  return messages as never
}

describe('buildRepoMapSummary', () => {
  test('summarizes recently referenced files within budget', () => {
    const context = createToolUseContext()
    context.readFileState.set('/repo/src/query.ts', {
      content: '',
      timestamp: Date.now(),
      offset: undefined,
      limit: undefined,
    })
    context.readFileState.set('/repo/src/utils/caveMode/toolCompression.ts', {
      content: '',
      timestamp: Date.now(),
      offset: undefined,
      limit: undefined,
    })

    const summary = buildRepoMapSummary(context, 120)
    expect(summary).toContain('Repository working set:')
    expect(summary).toContain('src/query.ts')
    expect(summary).toContain('src/utils/caveMode/toolCompression.ts')
  })
})

describe('buildMemoryRecallSummary', () => {
  test('returns null for empty memory content', async () => {
    const result = await buildMemoryRecallSummary(120, {
      waitForSessionMemoryExtraction: async () => {},
      getSessionMemoryContent: async () => '# Session Memory Template',
      isSessionMemoryEmpty: async () => true,
    })

    expect(result).toBeNull()
  })

  test('trims non-empty memory into bounded recall text', async () => {
    const result = await buildMemoryRecallSummary(40, {
      waitForSessionMemoryExtraction: async () => {},
      getSessionMemoryContent: async () =>
        '# Current State\n' + 'important detail\n'.repeat(200),
      isSessionMemoryEmpty: async () => false,
    })

    expect(result).toContain('Session memory recall:')
    expect(result).toContain('Current State')
  })
})

describe('applyCaveQueryOptimizations', () => {
  test('returns the original messages when cave mode is disabled', async () => {
    const originalEnv = process.env.TERSA_CAVE_MODE
    process.env.TERSA_CAVE_MODE = '0'
    setSessionSettingsCache({
      settings: {
        caveMode: {
          ...DEFAULT_CAVE_MODE_CONFIG,
          enabled: false,
        },
      },
      errors: [],
    })
    try {
      const messages = buildConversation(4)
      const result = await applyCaveQueryOptimizations({
        messages,
        model: 'gpt-4o',
        toolUseContext: createToolUseContext(),
      })

      expect(result.messages).toBe(messages)
      expect(result.systemPromptAdditions).toHaveLength(0)
      expect(result.metadata.changed).toBe(false)
      expect(result.metadata.caveModeEnabled).toBe(false)
    } finally {
      if (originalEnv === undefined) {
        delete process.env.TERSA_CAVE_MODE
      } else {
        process.env.TERSA_CAVE_MODE = originalEnv
      }
      resetSettingsCache()
    }
  })

  test('light intensity skips repo and memory prompt injection', async () => {
    setSessionSettingsCache({
      settings: {
        caveMode: {
          ...DEFAULT_CAVE_MODE_CONFIG,
          intensity: 'light',
        },
      },
      errors: [],
    })
    const context = createToolUseContext()
    context.readFileState.set('/repo/src/query.ts', {
      content: '',
      timestamp: Date.now(),
      offset: undefined,
      limit: undefined,
    })

    const result = await applyCaveQueryOptimizations({
      messages: buildConversation(2),
      model: 'gpt-4o',
      toolUseContext: context,
      deps: {
        waitForSessionMemoryExtraction: async () => {},
        getSessionMemoryContent: async () => '# Current State\nUseful memory.\n',
        isSessionMemoryEmpty: async () => false,
      },
    })

    expect(result.metadata.repoMapInjected).toBe(false)
    expect(result.metadata.memoryRecallInjected).toBe(false)
    expect(result.systemPromptAdditions).toHaveLength(0)
    resetSettingsCache()
  })

  test('compresses old tool history and injects repo/memory context', async () => {
    setSessionSettingsCache({
      settings: { caveMode: DEFAULT_CAVE_MODE_CONFIG },
      errors: [],
    })
    const context = createToolUseContext()
    context.readFileState.set('/repo/src/query.ts', {
      content: '',
      timestamp: Date.now(),
      offset: undefined,
      limit: undefined,
    })

    const result = await applyCaveQueryOptimizations({
      messages: buildConversation(12),
      model: 'gpt-4o',
      toolUseContext: context,
      deps: {
        waitForSessionMemoryExtraction: async () => {},
        getSessionMemoryContent: async () =>
          '# Current State\nNeed preserve tool history compression.\n',
        isSessionMemoryEmpty: async () => false,
      },
    })

    expect(result.metadata.softHistoryCompressed).toBe(true)
    expect(result.metadata.repoMapInjected).toBe(true)
    expect(result.metadata.memoryRecallInjected).toBe(true)
    expect(result.metadata.postHistoryCompressionTokens).toBeLessThan(
      result.metadata.baselineTokens,
    )
    expect(result.systemPromptAdditions).toHaveLength(2)

    const oldestToolResult = result.messages.find(
      msg =>
        msg.type === 'user' &&
        Array.isArray(msg.message.content) &&
        msg.message.content.some(block => block.type === 'tool_result'),
    )
    expect(JSON.stringify(oldestToolResult)).toContain('tool history')
    resetSettingsCache()
  })
})
