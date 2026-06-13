import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { setMlCompressionSpawnSyncImplForTest } from './mlCompression.js'
import {
  resetSettingsCache,
  setSessionSettingsCache,
} from '../settings/settingsCache.js'

function makeLargeText(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `line ${i + 1} `.repeat(12)).join('\n')
}

function makeContext() {
  return {
    abortController: new AbortController(),
    readFileState: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
      clear: () => {},
      entries: () => [],
      keys: () => [],
      values: () => [],
      has: () => false,
    } as never,
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
  } as never
}

async function runBashCompression(stdout: string) {
  const { processCaveToolResult } = await import(
    './toolCompression.js?ts=' + `${Date.now()}-${Math.random()}`
  )

  return processCaveToolResult({
    toolName: 'Bash',
    input: { command: 'cat huge.log' },
    output: {
      stdout,
      stderr: '',
      interrupted: false,
    },
    toolUseId: 'tool-ml',
    context: makeContext(),
    isError: false,
  })
}

beforeEach(() => {
  mock.restore()
  resetSettingsCache()
  setSessionSettingsCache({
    settings: {
      caveMode: {
        enabled: true,
        toolCompression: true,
        structuredCompression: true,
        readDeduplication: true,
        mlCompression: true,
        mlCompressionCommand: 'ml-sidecar',
        mlCompressionTimeoutMs: 1000,
        skillPromptCompression: true,
        skillPromptCompressionStyle: 'full',
        softHistoryCompression: true,
        rtkRewrite: true,
        repoMapInjection: true,
        memoryRecallInjection: true,
        historyPreserveRecentCount: 8,
        repoMapTokenBudget: 300,
        memoryRecallTokenBudget: 600,
        intensity: 'full',
      },
    },
    errors: [],
  })
})

afterEach(() => {
  mock.restore()
  setMlCompressionSpawnSyncImplForTest(undefined)
  resetSettingsCache()
})

test('processCaveToolResult uses the ML sidecar when configured', async () => {
  setMlCompressionSpawnSyncImplForTest(
    (() => ({
      status: 0,
      signal: null,
      pid: 1234,
      stdout: JSON.stringify({ text: 'sidecar summary\nkept tight' }),
      stderr: '',
      output: [null, '', ''],
    })) as never,
  )
  const { processCaveToolResult } = await import(
    './toolCompression.js?ts=' + `${Date.now()}-${Math.random()}`
  )

  const result = processCaveToolResult({
    toolName: 'Bash',
    input: { command: 'cat huge.log' },
    output: {
      stdout: makeLargeText(120),
      stderr: '',
      interrupted: false,
    },
    toolUseId: 'tool-ml',
    context: makeContext(),
    isError: false,
  })

  expect(result.changed).toBe(true)
  expect(result.metadata.strategy).toBe('combined')
  expect(
    (result.output as { stdout: string }).stdout,
  ).toBe('sidecar summary\nkept tight')
})

test('ML sidecar fails open on timeout or nonzero exit', async () => {
  setMlCompressionSpawnSyncImplForTest(
    (() => ({
      status: 1,
      signal: null,
      pid: 1234,
      stdout: '',
      stderr: 'failed',
      output: [null, '', 'failed'],
    })) as never,
  )

  const output = makeLargeText(40)
  const result = await runBashCompression(output)

  expect(result.changed).toBe(false)
  expect((result.output as { stdout: string }).stdout).toBe(output)
})

test('ML sidecar rejects small savings and keeps original output', async () => {
  const output = makeLargeText(40)
  setMlCompressionSpawnSyncImplForTest(
    (() => ({
      status: 0,
      signal: null,
      pid: 1234,
      stdout: JSON.stringify({ text: output.slice(0, -10) }),
      stderr: '',
      output: [null, '', ''],
    })) as never,
  )

  const result = await runBashCompression(output)

  expect(result.changed).toBe(false)
  expect((result.output as { stdout: string }).stdout).toBe(output)
})
