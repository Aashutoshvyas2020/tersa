import { relative } from 'path'
import type { Message } from '../../types/message.js'
import { getProjectRoot } from '../../bootstrap/state.js'
import { compressToolHistory } from '../../services/api/compressToolHistory.js'
import { roughTokenCountEstimation } from '../../services/tokenEstimation.js'
import {
  getSessionMemoryContent,
  waitForSessionMemoryExtraction,
} from '../../services/SessionMemory/sessionMemoryUtils.js'
import {
  isSessionMemoryEmpty,
  truncateSessionMemoryForCompact,
} from '../../services/SessionMemory/prompts.js'
import { cacheKeys } from '../fileStateCache.js'
import { tokenCountWithEstimation } from '../tokens.js'
import { getCaveModeConfig } from './config.js'
import type { CaveQueryOptimizationMetadata } from './types.js'
import type { ToolUseContext } from '../../Tool.js'

type QueryPipelineDeps = {
  getSessionMemoryContent: typeof getSessionMemoryContent
  waitForSessionMemoryExtraction: typeof waitForSessionMemoryExtraction
  isSessionMemoryEmpty: typeof isSessionMemoryEmpty
}

const DEFAULT_DEPS: QueryPipelineDeps = {
  getSessionMemoryContent,
  waitForSessionMemoryExtraction,
  isSessionMemoryEmpty,
}

export type ApplyCaveQueryOptimizationsArgs = {
  messages: Message[]
  model: string
  toolUseContext: ToolUseContext
  deps?: Partial<QueryPipelineDeps>
}

export type ApplyCaveQueryOptimizationsResult = {
  messages: Message[]
  systemPromptAdditions: string[]
  metadata: CaveQueryOptimizationMetadata
}

function trimToTokenBudget(text: string, tokenBudget: number): string {
  if (tokenBudget <= 0) return ''
  if (roughTokenCountEstimation(text) <= tokenBudget) return text

  const maxChars = Math.max(1, tokenBudget * 4)
  const clipped = text.slice(0, maxChars)
  const lastNewline = clipped.lastIndexOf('\n')
  const head = lastNewline > maxChars * 0.6 ? clipped.slice(0, lastNewline) : clipped
  return `${head}\n[... truncated for token budget ...]`
}

export function buildRepoMapSummary(
  toolUseContext: Pick<ToolUseContext, 'readFileState'>,
  tokenBudget: number,
): string | null {
  const seenPaths = cacheKeys(toolUseContext.readFileState)
  if (seenPaths.length === 0) return null

  const projectRoot = getProjectRoot() ?? ''
  const relPaths = seenPaths
    .map(path =>
      projectRoot && path.startsWith(projectRoot)
        ? relative(projectRoot, path) || '.'
        : path,
    )
    .slice(-24)

  const dirs = new Map<string, number>()
  for (const filePath of relPaths) {
    const parts = filePath.split('/').filter(Boolean)
    const dir =
      parts.length <= 1 ? '.' : parts.slice(0, Math.min(parts.length - 1, 2)).join('/')
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1)
  }

  const topDirs = [...dirs.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([dir, count]) => `${dir} (${count})`)

  const summary = [
    'Repository working set:',
    topDirs.length > 0 ? `Hot directories: ${topDirs.join(', ')}` : null,
    'Recently referenced files:',
    ...relPaths.slice(-12).map(path => `- ${path}`),
  ]
    .filter(Boolean)
    .join('\n')

  const trimmed = trimToTokenBudget(summary, tokenBudget)
  return trimmed.length > 0 ? trimmed : null
}

export async function buildMemoryRecallSummary(
  tokenBudget: number,
  deps: Partial<QueryPipelineDeps> = {},
): Promise<string | null> {
  if (tokenBudget <= 0) return null
  const impl = { ...DEFAULT_DEPS, ...deps }
  await impl.waitForSessionMemoryExtraction()
  const content = await impl.getSessionMemoryContent()
  if (!content) return null
  if (await impl.isSessionMemoryEmpty(content)) return null

  const { truncatedContent, wasTruncated } = truncateSessionMemoryForCompact(
    content,
  )
  const trimmed = trimToTokenBudget(truncatedContent, tokenBudget)
  if (trimmed.length === 0) return null

  return wasTruncated
    ? `Session memory recall:\n${trimmed}\n[Session memory truncated before injection.]`
    : `Session memory recall:\n${trimmed}`
}

export async function applyCaveQueryOptimizations(
  args: ApplyCaveQueryOptimizationsArgs,
): Promise<ApplyCaveQueryOptimizationsResult> {
  const config = getCaveModeConfig()
  const baselineTokens = tokenCountWithEstimation(args.messages)

  if (!config.enabled) {
    return {
      messages: args.messages,
      systemPromptAdditions: [],
      metadata: {
        caveModeEnabled: false,
        changed: false,
        softHistoryCompressed: false,
        repoMapInjected: false,
        memoryRecallInjected: false,
        baselineTokens,
        postHistoryCompressionTokens: baselineTokens,
        finalEstimatedTokens: baselineTokens,
        repoMapTokens: 0,
        memoryRecallTokens: 0,
      },
    }
  }

  let nextMessages = args.messages
  let softHistoryCompressed = false
  if (config.softHistoryCompression) {
    const effectiveWindow = (() => {
      const preserved = Math.max(config.historyPreserveRecentCount, 0)
      if (preserved <= 2) return 15_000
      if (preserved <= 3) return 24_000
      if (preserved <= 4) return 48_000
      if (preserved <= 5) return 96_000
      if (preserved <= 8) return 200_000
      if (preserved <= 12) return 400_000
      return 1_000_000
    })()
    const compressed = compressToolHistory(nextMessages, args.model, {
      effectiveContextWindowSize: effectiveWindow,
      forceEnabled: true,
    })
    softHistoryCompressed = compressed !== nextMessages
    nextMessages = compressed
  }

  const postHistoryCompressionTokens = tokenCountWithEstimation(nextMessages)
  const systemPromptAdditions: string[] = []

  let repoMapTokens = 0
  let memoryRecallTokens = 0
  let repoMapInjected = false
  let memoryRecallInjected = false

  if (config.intensity === 'full' && config.repoMapInjection) {
    const repoMapSummary = buildRepoMapSummary(
      args.toolUseContext,
      config.repoMapTokenBudget,
    )
    if (repoMapSummary) {
      repoMapInjected = true
      repoMapTokens = roughTokenCountEstimation(repoMapSummary)
      systemPromptAdditions.push(repoMapSummary)
    }
  }

  if (config.intensity === 'full' && config.memoryRecallInjection) {
    const memorySummary = await buildMemoryRecallSummary(
      config.memoryRecallTokenBudget,
      args.deps,
    )
    if (memorySummary) {
      memoryRecallInjected = true
      memoryRecallTokens = roughTokenCountEstimation(memorySummary)
      systemPromptAdditions.push(memorySummary)
    }
  }

  return {
    messages: nextMessages,
    systemPromptAdditions,
    metadata: {
      caveModeEnabled: true,
      changed:
        softHistoryCompressed || repoMapInjected || memoryRecallInjected,
      softHistoryCompressed,
      repoMapInjected,
      memoryRecallInjected,
      baselineTokens,
      postHistoryCompressionTokens,
      finalEstimatedTokens:
        postHistoryCompressionTokens + repoMapTokens + memoryRecallTokens,
      repoMapTokens,
      memoryRecallTokens,
    },
  }
}
