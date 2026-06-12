import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createFileStateCacheWithSizeLimit } from '../fileStateCache.js'
import type { ToolUseContext } from '../../Tool.js'
import { DEFAULT_CAVE_MODE_CONFIG } from './config.js'
import {
  resetSettingsCache,
  setSessionSettingsCache,
} from '../settings/settingsCache.js'
import {
  collapseBlankLines,
  processCaveToolResult,
  stripAnsiSequences,
  truncateToLineBudget,
} from './index.js'

function makeContext(): ToolUseContext {
  const appState = {
    toolPermissionContext: {
      mode: 'default',
      additionalWorkingDirectories: new Map<string, string>(),
      alwaysAllowRules: {},
      alwaysDenyRules: {},
      alwaysAskRules: {},
    },
    mcp: { clients: [], tools: [] },
    todos: {},
  }

  return {
    options: {
      commands: [],
      debug: false,
      mainLoopModel: 'test-model',
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
    abortController: new AbortController(),
    readFileState: createFileStateCacheWithSizeLimit(32),
    messages: [],
    getAppState: () => appState as never,
    setAppState: () => {},
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
  } as unknown as ToolUseContext
}

function lines(count: number): string {
  return Array.from({ length: count }, (_, i) => `line ${i + 1}`).join('\n')
}

describe('stripAnsiSequences', () => {
  test('removes ansi escapes and preserves text', () => {
    expect(stripAnsiSequences('\u001B[31mred\u001B[0m plain')).toBe('red plain')
  })
})

describe('collapseBlankLines', () => {
  test('collapses 3+ blank lines to one', () => {
    expect(collapseBlankLines('a\n\n\n\nb\n\n\nc')).toBe('a\n\nb\n\nc')
  })
})

describe('truncateToLineBudget', () => {
  test('keeps configured head and tail windows', () => {
    const result = truncateToLineBudget(lines(10), {
      maxLines: 6,
      headLines: 4,
      tailLines: 2,
    })

    expect(result.changed).toBe(true)
    expect(result.text).toContain('line 1')
    expect(result.text).toContain('line 4')
    expect(result.text).toContain('line 9')
    expect(result.text).toContain('line 10')
    expect(result.text).not.toContain('line 5\nline 6\nline 7')
  })
})

describe('processCaveToolResult', () => {
  beforeEach(() => {
    setSessionSettingsCache({
      settings: { caveMode: DEFAULT_CAVE_MODE_CONFIG },
      errors: [],
    })
  })

  afterEach(() => {
    delete process.env.TERSA_CAVE_MODE
    resetSettingsCache()
  })

  test('compresses large bash stdout with per-tool budget', () => {
    const result = processCaveToolResult({
      toolName: 'Bash',
      input: { command: 'cat huge.log' },
      output: {
        stdout: lines(100),
        stderr: '',
        interrupted: false,
      },
      toolUseId: 'tool-1',
      context: makeContext(),
      isError: false,
    })

    expect(result.changed).toBe(true)
    expect(result.metadata.strategy).toBe('budget')
    expect((result.output as { stdout: string }).stdout).toContain('line 1')
    expect((result.output as { stdout: string }).stdout).toContain('line 100')
    expect((result.output as { stdout: string }).stdout).not.toContain('line 60')
  })

  test('compresses large Read text payload with read budget', () => {
    const result = processCaveToolResult({
      toolName: 'Read',
      input: { file_path: '/tmp/example.ts' },
      output: {
        type: 'text',
        file: {
          filePath: '/tmp/example.ts',
          content: lines(350),
          numLines: 350,
          startLine: 1,
          totalLines: 350,
        },
      },
      toolUseId: 'tool-2',
      context: makeContext(),
      isError: false,
    })

    expect(result.changed).toBe(true)
    expect(result.metadata.strategy).toBe('budget')
    expect((result.output as { file: { content: string } }).file.content).toContain(
      'line 1',
    )
    expect((result.output as { file: { content: string } }).file.content).toContain(
      'line 350',
    )
    expect((result.output as { file: { content: string } }).file.content).not.toContain(
      'line 250',
    )
  })

  test('does not modify image read outputs', () => {
    const output = {
      type: 'image',
      file: {
        base64: 'abc',
        type: 'image/png',
        originalSize: 3,
      },
    }

    const result = processCaveToolResult({
      toolName: 'Read',
      input: { file_path: '/tmp/image.png' },
      output,
      toolUseId: 'tool-3',
      context: makeContext(),
      isError: false,
    })

    expect(result.changed).toBe(false)
    expect(result.output).toBe(output)
  })

  test('error mode only applies cosmetic cleanup', () => {
    const result = processCaveToolResult({
      toolName: 'Bash',
      input: { command: 'bad-command' },
      output: {
        stdout: '\u001B[31mboom\u001B[0m\n\n\ntrace line',
        stderr: '',
        interrupted: false,
      },
      toolUseId: 'tool-4',
      context: makeContext(),
      isError: true,
    })

    expect(result.changed).toBe(true)
    expect(result.metadata.strategy).toBe('combined')
    expect((result.output as { stdout: string }).stdout).toBe('boom\n\ntrace line')
  })
})
