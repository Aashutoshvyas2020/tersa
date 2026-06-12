import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process'
import { getCaveModeConfig } from './config.js'
import type { ProcessCaveToolResultArgs } from './types.js'

const DEFAULT_MIN_INPUT_CHARS = 2400
const DEFAULT_MIN_SAVINGS_RATIO = 0.12
const DEFAULT_TIMEOUT_MS = 1500

type MlCompressionRequest = {
  tool_name: string
  tool_use_id: string
  input: unknown
  text: string
  is_error: boolean
  deterministic_changed: boolean
  deterministic_strategies: string[]
  cave_mode: {
    enabled: boolean
    toolCompression: boolean
    structuredCompression: boolean
    readDeduplication: boolean
    skillPromptCompression?: boolean
    skillPromptCompressionStyle?: string
    softHistoryCompression: boolean
    rtkRewrite: boolean
    repoMapInjection: boolean
    memoryRecallInjection: boolean
    intensity: string
  }
}

type MlCompressionResponse = {
  text?: unknown
  output?: unknown
  changed?: unknown
  strategy?: unknown
}

type SpawnSyncImpl = (
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) => SpawnSyncReturns<string>

let spawnSyncImpl: SpawnSyncImpl = spawnSync as SpawnSyncImpl

function getMlCompressionCommand(): string | null {
  const config = getCaveModeConfig()
  return (
    config.mlCompressionCommand?.trim() ||
    process.env.TERSA_ML_COMPRESSION_COMMAND?.trim() ||
    null
  )
}

function getMlCompressionTimeoutMs(): number {
  const config = getCaveModeConfig()
  const timeout = config.mlCompressionTimeoutMs
  if (timeout && Number.isFinite(timeout) && timeout > 0) {
    return timeout
  }
  const envTimeout = Number.parseInt(
    process.env.TERSA_ML_COMPRESSION_TIMEOUT_MS ?? '',
    10,
  )
  return Number.isFinite(envTimeout) && envTimeout > 0
    ? envTimeout
    : DEFAULT_TIMEOUT_MS
}

function getMinInputChars(): number {
  const envMinChars = Number.parseInt(
    process.env.TERSA_ML_COMPRESSION_MIN_CHARS ?? '',
    10,
  )
  return Number.isFinite(envMinChars) && envMinChars > 0
    ? envMinChars
    : DEFAULT_MIN_INPUT_CHARS
}

function getMinSavingsRatio(): number {
  const envRatio = Number.parseFloat(
    process.env.TERSA_ML_COMPRESSION_MIN_SAVINGS_RATIO ?? '',
  )
  return Number.isFinite(envRatio) && envRatio > 0 && envRatio < 1
    ? envRatio
    : DEFAULT_MIN_SAVINGS_RATIO
}

function parseResponse(stdout: string): string | null {
  const trimmed = stdout.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as MlCompressionResponse
      const candidate =
        typeof parsed.text === 'string'
          ? parsed.text
          : typeof parsed.output === 'string'
            ? parsed.output
            : null
      return candidate?.trimEnd() ?? null
    } catch {
      return null
    }
  }

  return trimmed
}

export function setMlCompressionSpawnSyncImplForTest(
  impl: SpawnSyncImpl | undefined,
): void {
  spawnSyncImpl = impl ?? (spawnSync as SpawnSyncImpl)
}

export function hasMlCompressionSidecar(): boolean {
  return Boolean(getMlCompressionCommand())
}

export function getMlCompressionStatusLabel(): string {
  const config = getCaveModeConfig()
  if (!config.enabled || !config.mlCompression) return 'off'
  return hasMlCompressionSidecar() ? 'sidecar' : 'enabled'
}

export function maybeCompressTextWithMlSidecar(
  args: ProcessCaveToolResultArgs & {
    text: string
    deterministicChanged: boolean
    deterministicStrategies: string[]
  },
): {
  text: string
  changed: boolean
} {
  const config = getCaveModeConfig()
  if (!config.enabled || !config.mlCompression || args.isError) {
    return { text: args.text, changed: false }
  }

  const command = getMlCompressionCommand()
  if (!command) {
    return { text: args.text, changed: false }
  }

  if (args.text.length < getMinInputChars()) {
    return { text: args.text, changed: false }
  }

  const payload: MlCompressionRequest = {
    tool_name: args.toolName,
    tool_use_id: args.toolUseId,
    input: args.input,
    text: args.text,
    is_error: args.isError,
    deterministic_changed: args.deterministicChanged,
    deterministic_strategies: args.deterministicStrategies,
    cave_mode: {
      enabled: config.enabled,
      toolCompression: config.toolCompression,
      structuredCompression: config.structuredCompression,
      readDeduplication: config.readDeduplication,
      skillPromptCompression: config.skillPromptCompression,
      skillPromptCompressionStyle: config.skillPromptCompressionStyle,
      softHistoryCompression: config.softHistoryCompression,
      rtkRewrite: config.rtkRewrite,
      repoMapInjection: config.repoMapInjection,
      memoryRecallInjection: config.memoryRecallInjection,
      intensity: config.intensity,
    },
  }

  const timeoutMs = getMlCompressionTimeoutMs()
  const result = spawnSyncImpl(command, [], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  })

  if (result.error || result.status !== 0 || result.signal) {
    return { text: args.text, changed: false }
  }

  const next = parseResponse(result.stdout ?? '')
  if (!next || next.length >= args.text.length) {
    return { text: args.text, changed: false }
  }

  const savingsRatio = 1 - next.length / Math.max(1, args.text.length)
  if (savingsRatio < getMinSavingsRatio()) {
    return { text: args.text, changed: false }
  }

  return { text: next, changed: true }
}
