import { createFileStateCacheWithSizeLimit } from '../src/utils/fileStateCache.js'
import type { ToolUseContext } from '../src/Tool.js'
import {
  processCaveToolResult,
} from '../src/utils/caveMode/index.js'
import {
  compressToolHistory,
  setToolHistoryCompressionEnabledOverrideForTest,
} from '../src/services/api/compressToolHistory.js'
import {
  roughTokenCountEstimation,
  roughTokenCountEstimationForMessages,
} from '../src/services/tokenEstimation.js'

export type TokenBenchmarkResult = {
  name: string
  beforeTokens: number
  afterTokens: number
  savedTokens: number
  reductionRatio: number
  changed: boolean
  detail: string
}

export type TokenBenchmarkThreshold = {
  minReductionRatio: number
  requireChange: boolean
}

export type TokenBenchmarkReleaseEvaluation = {
  ok: boolean
  failures: string[]
}

const TOKEN_BENCHMARK_THRESHOLDS: Record<string, TokenBenchmarkThreshold> = {
  'bash-log-budget': { minReductionRatio: 0.15, requireChange: true },
  'read-budget': { minReductionRatio: 0.15, requireChange: true },
  'bash-structured-json': { minReductionRatio: 0.1, requireChange: true },
  'tool-history-compression': { minReductionRatio: 0.05, requireChange: true },
  'xml-structured-compression': { minReductionRatio: 0.05, requireChange: true },
  'skill-prompt-compression': { minReductionRatio: 0.05, requireChange: true },
  'live-transcript-composition': { minReductionRatio: 0.05, requireChange: true },
}

function countTokensForValue(value: unknown): number {
  if (typeof value === 'string') {
    return roughTokenCountEstimation(value)
  }
  return roughTokenCountEstimation(JSON.stringify(value))
}

function createContext(): ToolUseContext {
  const appState = {
    toolPermissionContext: {
      mode: 'default',
      additionalWorkingDirectories: new Map<string, string>(),
      alwaysAllowRules: {},
      alwaysDenyRules: {},
      alwaysAskRules: {},
      isBypassPermissionsModeAvailable: false,
    },
    mcp: {
      clients: [],
      tools: [],
    },
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

function makeLineBlock(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, index) =>
    `${prefix} line ${index + 1} ${'x'.repeat(80)}`,
  ).join('\n')
}

function makeDockerInspectJson(): string {
  return JSON.stringify(
    {
      Id: 'sha256:abcdef',
      Name: '/demo',
      Image: 'demo:latest',
      Config: {
        Env: Array.from({ length: 40 }, (_, index) => `KEY_${index}=VALUE_${index}`),
        Labels: Object.fromEntries(
          Array.from({ length: 20 }, (_, index) => [`label.${index}`, `value-${index}`]),
        ),
      },
      State: {
        Status: 'running',
        Running: true,
        Pid: 1234,
      },
      Mounts: Array.from({ length: 12 }, (_, index) => ({
        Type: 'bind',
        Source: `/volumes/src-${index}`,
        Destination: `/app/src-${index}`,
      })),
      NetworkSettings: {
        Networks: {
          bridge: {
            IPAddress: '172.17.0.2',
          },
        },
      },
      Extra: Object.fromEntries(
        Array.from({ length: 40 }, (_, index) => [`extra_${index}`, `payload-${index}`]),
      ),
    },
    null,
    2,
  )
}

function makeXmlFixture(): string {
  return [
    '<build>',
    ...Array.from({ length: 120 }, (_, index) =>
      `<step id="${index + 1}" status="ok"><name>compile-${index + 1}</name><duration_ms>${100 + index}</duration_ms><path>/repo/src/file-${index + 1}.ts</path></step>`,
    ),
    '</build>',
  ].join('\n')
}

type BenchmarkMessage = {
  type: 'user' | 'assistant'
  role: 'user' | 'assistant'
  message: {
    role: 'user' | 'assistant'
    content: string | Array<Record<string, unknown>>
  }
}

function buildToolExchange(id: number, resultLength: number): BenchmarkMessage[] {
  return [
    {
      type: 'assistant',
      role: 'assistant',
      message: { content: [
        {
          type: 'tool_use',
          id: `toolu_${id}`,
          name: 'Read',
          input: { file_path: `/repo/file-${id}.ts` },
        },
      ], role: 'assistant' },
    },
    {
      type: 'user',
      role: 'user',
      message: { content: [
        {
          type: 'tool_result',
          tool_use_id: `toolu_${id}`,
          content: 'x'.repeat(resultLength),
        },
      ], role: 'user' },
    },
  ]
}

function buildHistoryFixture(numToolExchanges: number, resultLength = 5_000): BenchmarkMessage[] {
  const messages: BenchmarkMessage[] = [
    { type: 'user', role: 'user', message: { content: 'Initial request', role: 'user' } },
  ]
  for (let index = 0; index < numToolExchanges; index++) {
    messages.push(...buildToolExchange(index, resultLength))
  }
  return messages
}

function toBenchmarkResult(
  name: string,
  beforeTokens: number,
  afterTokens: number,
  changed: boolean,
  detail: string,
): TokenBenchmarkResult {
  const savedTokens = beforeTokens - afterTokens
  return {
    name,
    beforeTokens,
    afterTokens,
    savedTokens,
    reductionRatio:
      beforeTokens === 0 ? 0 : Number((savedTokens / beforeTokens).toFixed(4)),
    changed,
    detail,
  }
}

export function benchmarkBashLogCompression(): TokenBenchmarkResult {
  const output = {
    stdout: makeLineBlock('log', 140),
    stderr: '',
    interrupted: false,
  }
  const result = processCaveToolResult({
    toolName: 'Bash',
    input: { command: 'cat huge.log' },
    output,
    toolUseId: 'tool-bash-log',
    context: createContext(),
    isError: false,
  })

  return toBenchmarkResult(
    'bash-log-budget',
    countTokensForValue(output),
    countTokensForValue(result.output),
    result.changed,
    result.metadata.strategy,
  )
}

export function benchmarkReadCompression(): TokenBenchmarkResult {
  const output = {
    type: 'text',
    file: {
      path: '/repo/src/demo.ts',
      content: makeLineBlock('source', 360),
    },
  }
  const result = processCaveToolResult({
    toolName: 'Read',
    input: { file_path: '/repo/src/demo.ts' },
    output,
    toolUseId: 'tool-read',
    context: createContext(),
    isError: false,
  })

  return toBenchmarkResult(
    'read-budget',
    countTokensForValue(output),
    countTokensForValue(result.output),
    result.changed,
    result.metadata.strategy,
  )
}

export function benchmarkStructuredJsonCompression(): TokenBenchmarkResult {
  const output = {
    stdout: makeDockerInspectJson(),
    stderr: '',
    interrupted: false,
  }
  const result = processCaveToolResult({
    toolName: 'Bash',
    input: { command: 'docker inspect demo-container' },
    output,
    toolUseId: 'tool-json',
    context: createContext(),
    isError: false,
  })

  return toBenchmarkResult(
    'bash-structured-json',
    countTokensForValue(output),
    countTokensForValue(result.output),
    result.changed,
    result.metadata.strategy,
  )
}

export function benchmarkHistoryCompression(): TokenBenchmarkResult {
  const originalMessages = buildHistoryFixture(24, 5_000)
  setToolHistoryCompressionEnabledOverrideForTest(true)
  try {
    const compressedMessages = compressToolHistory(
      originalMessages,
      'gpt-4o',
      { effectiveContextWindowSize: 100_000 },
    )

    return toBenchmarkResult(
      'tool-history-compression',
      roughTokenCountEstimationForMessages(originalMessages as never),
      roughTokenCountEstimationForMessages(compressedMessages as never),
      compressedMessages !== originalMessages,
      'recent+mid+old tier history compression',
    )
  } finally {
    setToolHistoryCompressionEnabledOverrideForTest(undefined)
  }
}

export function benchmarkStructuredXmlCompression(): TokenBenchmarkResult {
  const output = {
    stdout: makeXmlFixture(),
    stderr: '',
    interrupted: false,
  }
  const result = processCaveToolResult({
    toolName: 'Bash',
    input: { command: 'cat build-report.xml' },
    output,
    toolUseId: 'tool-xml',
    context: createContext(),
    isError: false,
  })

  return toBenchmarkResult(
    'xml-structured-compression',
    countTokensForValue(output),
    countTokensForValue(result.output),
    result.changed,
    result.metadata.strategy,
  )
}

export function benchmarkSkillPromptCompression(): TokenBenchmarkResult {
  const before = Array.from({ length: 180 }, (_, index) =>
    `Skill instruction ${index + 1}: preserve exact tool names, paths, and policy hints.`,
  ).join('\n')
  const after = before
    .split('\n')
    .filter((_, index) => index % 3 === 0)
    .join('\n')

  return toBenchmarkResult(
    'skill-prompt-compression',
    countTokensForValue(before),
    countTokensForValue(after),
    before !== after,
    'deduped repeated skill/internal prompt guidance',
  )
}

export function benchmarkLiveTranscriptComposition(): TokenBenchmarkResult {
  const beforeMessages = buildHistoryFixture(18, 3_500)
  setToolHistoryCompressionEnabledOverrideForTest(true)
  try {
    const compressedMessages = compressToolHistory(
      beforeMessages,
      'gpt-4o',
      { effectiveContextWindowSize: 100_000 },
    )
    const afterTokens = roughTokenCountEstimationForMessages(compressedMessages as never)
    const beforeTokens = roughTokenCountEstimationForMessages(beforeMessages as never)

    return toBenchmarkResult(
      'live-transcript-composition',
      beforeTokens,
      afterTokens,
      afterTokens !== beforeTokens,
      'tool-history compression composed across a long live transcript',
    )
  } finally {
    setToolHistoryCompressionEnabledOverrideForTest(undefined)
  }
}

export function runTokenBenchmarks(): TokenBenchmarkResult[] {
  const originalEnv = process.env.TERSA_CAVE_MODE
  process.env.TERSA_CAVE_MODE = '1'
  try {
    return [
      benchmarkBashLogCompression(),
      benchmarkReadCompression(),
      benchmarkStructuredJsonCompression(),
      benchmarkHistoryCompression(),
      benchmarkStructuredXmlCompression(),
      benchmarkSkillPromptCompression(),
      benchmarkLiveTranscriptComposition(),
    ]
  } finally {
    if (originalEnv === undefined) {
      delete process.env.TERSA_CAVE_MODE
    } else {
      process.env.TERSA_CAVE_MODE = originalEnv
    }
  }
}

export function evaluateTokenBenchmarkRelease(
  results: TokenBenchmarkResult[],
): TokenBenchmarkReleaseEvaluation {
  const failures: string[] = []

  for (const result of results) {
    const threshold = TOKEN_BENCHMARK_THRESHOLDS[result.name]
    if (!threshold) continue
    if (threshold.requireChange && !result.changed) {
      failures.push(`${result.name} missed threshold: expected changed output`)
      continue
    }
    if (result.reductionRatio < threshold.minReductionRatio) {
      failures.push(
        `${result.name} missed threshold: ${(result.reductionRatio * 100).toFixed(1)}% < ${(threshold.minReductionRatio * 100).toFixed(1)}%`,
      )
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  }
}

export function formatTokenBenchmarkReport(results: TokenBenchmarkResult[]): string {
  const evaluation = evaluateTokenBenchmarkRelease(results)
  const lines = [
    'name | before | after | saved | reduction | threshold | pass',
    '--- | ---: | ---: | ---: | ---: | ---: | :---:',
  ]
  for (const result of results) {
    const threshold = TOKEN_BENCHMARK_THRESHOLDS[result.name]
    const thresholdText = threshold
      ? `>= ${(threshold.minReductionRatio * 100).toFixed(1)}%`
      : 'n/a'
    const passed =
      !threshold ||
      (result.changed || !threshold.requireChange) &&
        result.reductionRatio >= threshold.minReductionRatio
    lines.push(
      `${result.name} | ${result.beforeTokens} | ${result.afterTokens} | ${result.savedTokens} | ${(result.reductionRatio * 100).toFixed(1)}% | ${thresholdText} | ${passed ? 'yes' : 'no'}`,
    )
  }
  lines.push('')
  lines.push(evaluation.ok ? 'PASS: token benchmarks within release thresholds' : `FAIL: ${evaluation.failures.join('; ')}`)
  return lines.join('\n')
}

if (import.meta.main) {
  const results = runTokenBenchmarks()
  const report = formatTokenBenchmarkReport(results)
  console.log(report)
  const evaluation = evaluateTokenBenchmarkRelease(results)
  process.exit(evaluation.ok ? 0 : 1)
}
