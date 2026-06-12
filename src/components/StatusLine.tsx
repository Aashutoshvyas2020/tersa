import { feature } from 'bun:bundle'
import * as React from 'react'
import { basename } from 'path'
import { homedir } from 'os'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { logEvent } from 'src/services/analytics/index.js'
import { useAppState, useSetAppState } from 'src/state/AppState.js'
import type { PermissionMode } from 'src/utils/permissions/PermissionMode.js'
import {
  getIsRemoteMode,
  getKairosActive,
  getMainThreadAgentType,
  getOriginalCwd,
  getSdkBetas,
  getSessionId,
} from '../bootstrap/state.js'
import { color } from '../components/design-system/color.js'
import { DEFAULT_OUTPUT_STYLE_NAME } from '../constants/outputStyles.js'
import { useNotifications } from '../context/notifications.js'
import { useTerminalSize } from '../hooks/useTerminalSize.js'
import {
  getTotalAPIDuration,
  getTotalCost,
  getTotalDuration,
  getTotalInputTokens,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getTotalOutputTokens,
} from '../cost-tracker.js'
import { useMainLoopModel } from '../hooks/useMainLoopModel.js'
import { useIdeConnectionStatus } from '../hooks/useIdeConnectionStatus.js'
import { type ReadonlySettings, useSettings } from '../hooks/useSettings.js'
import { Ansi, Box, Text, useTheme } from '../ink.js'
import { stringWidth } from '../ink/stringWidth.js'
import { getRawUtilization } from '../services/tersaAiLimits.js'
import type { Message } from '../types/message.js'
import type {
  BuiltinStatusLineConfig,
  BuiltinStatusLineItemId,
  StatusLineCommandInput,
} from '../types/statusLine.js'
import type { VimMode } from '../types/textInputTypes.js'
import { checkHasTrustDialogAccepted } from '../utils/config.js'
import {
  calculateContextPercentages,
  getContextWindowForModel,
} from '../utils/context.js'
import { getCwd } from '../utils/cwd.js'
import { logForDebugging } from '../utils/debug.js'
import { getDisplayedEffortLevel } from '../utils/effort.js'
import { execFileNoThrow } from '../utils/execFileNoThrow.js'
import { isFullscreenEnvEnabled } from '../utils/fullscreen.js'
import { getDefaultBranch, getIsGit, gitExe } from '../utils/git.js'
import { createBaseHookInput, executeStatusLineCommand } from '../utils/hooks.js'
import { getLastAssistantMessage } from '../utils/messages.js'
import { getTersaModesConfig } from '../utils/modes/config.js'
import { getAPIProvider } from '../utils/model/providers.js'
import {
  getRuntimeMainLoopModel,
  type ModelName,
  renderModelName,
} from '../utils/model/model.js'
import { permissionModeTitle } from '../utils/permissions/PermissionMode.js'
import { getCurrentSessionTitle } from '../utils/sessionStorage.js'
import {
  doesMostRecentAssistantMessageExceed200k,
  getCurrentUsage,
  getTokenCountFromUsage,
  tokenCountWithEstimation,
} from '../utils/tokens.js'
import { getCurrentWorktreeSession } from '../utils/worktree.js'
import { isVimModeEnabled } from './PromptInput/utils.js'
import { DEFAULT_CAVE_MODE_CONFIG } from '../utils/caveMode/config.js'
import { isFastModeEnabled } from '../utils/fastMode.js'
import type { ThemeName } from '../utils/theme.js'
import { getDisplayPath } from '../utils/file.js'
import { getAuthTokenSource } from '../utils/auth.js'
import { isBackgroundTask } from '../tasks/types.js'
import {
  normalizeBuiltinStatusLineConfig,
} from './statusline/statusLineConfig.js'

export function statusLineShouldDisplay(settings: ReadonlySettings): boolean {
  if (feature('KAIROS') && getKairosActive()) return false
  if (!settings?.statusLine) return false
  if (settings.statusLine.type === 'builtin') {
    return settings.statusLine.enabled !== false
  }
  return true
}

function buildStatusLineCommandInput(
  permissionMode: PermissionMode,
  exceeds200kTokens: boolean,
  settings: ReadonlySettings,
  messages: Message[],
  addedDirs: string[],
  mainLoopModel: ModelName,
  vimMode?: VimMode,
): StatusLineCommandInput {
  const agentType = getMainThreadAgentType()
  const worktreeSession = getCurrentWorktreeSession()
  const runtimeModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel,
    exceeds200kTokens,
  })
  const outputStyleName = settings?.outputStyle || DEFAULT_OUTPUT_STYLE_NAME
  const currentUsage = getCurrentUsage(messages)
  const contextWindowSize = getContextWindowForModel(runtimeModel, getSdkBetas())
  const contextPercentages = calculateContextPercentages(
    currentUsage,
    contextWindowSize,
  )
  const sessionId = getSessionId()
  const sessionName = getCurrentSessionTitle(sessionId)
  const rawUtil = getRawUtilization()
  const rateLimits: StatusLineCommandInput['rate_limits'] = {
    ...(rawUtil.five_hour && {
      five_hour: {
        used_percentage: rawUtil.five_hour.utilization * 100,
        resets_at: rawUtil.five_hour.resets_at,
      },
    }),
    ...(rawUtil.seven_day && {
      seven_day: {
        used_percentage: rawUtil.seven_day.utilization * 100,
        resets_at: rawUtil.seven_day.resets_at,
      },
    }),
  }

  return {
    ...createBaseHookInput(),
    ...(sessionName && {
      session_name: sessionName,
    }),
    model: {
      id: runtimeModel,
      display_name: renderModelName(runtimeModel),
    },
    workspace: {
      current_dir: getCwd(),
      project_dir: getOriginalCwd(),
      added_dirs: addedDirs,
    },
    version: MACRO.VERSION,
    output_style: {
      name: outputStyleName,
    },
    cost: {
      total_cost_usd: getTotalCost(),
      total_duration_ms: getTotalDuration(),
      total_api_duration_ms: getTotalAPIDuration(),
      total_lines_added: getTotalLinesAdded(),
      total_lines_removed: getTotalLinesRemoved(),
    },
    context_window: {
      total_input_tokens: getTotalInputTokens(),
      total_output_tokens: getTotalOutputTokens(),
      context_window_size: contextWindowSize,
      current_usage: currentUsage,
      used_percentage: contextPercentages.used,
      remaining_percentage: contextPercentages.remaining,
    },
    exceeds_200k_tokens: exceeds200kTokens,
    ...((rateLimits.five_hour || rateLimits.seven_day) && {
      rate_limits: rateLimits,
    }),
    ...(isVimModeEnabled() && {
      vim: {
        mode: vimMode ?? 'INSERT',
      },
    }),
    ...(agentType && {
      agent: {
        name: agentType,
      },
    }),
    ...(getIsRemoteMode() && {
      remote: {
        session_id: getSessionId(),
      },
    }),
    ...(worktreeSession && {
      worktree: {
        name: worktreeSession.worktreeName,
        path: worktreeSession.worktreePath,
        branch: worktreeSession.worktreeBranch,
        original_cwd: worktreeSession.originalCwd,
        original_branch: worktreeSession.originalBranch,
      },
    }),
  }
}

type Props = {
  messagesRef: React.RefObject<Message[]>
  lastAssistantMessageId: string | null
  vimMode?: VimMode
  isLoading: boolean
}

type RepoStatusLineData = {
  branch: string | null
  branchChanges: number | null
}

function formatCompactNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(value)
    .toLowerCase()
}

function formatPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return `${Math.max(0, Math.round(value))}%`
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatTokenCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(value)
    .toLowerCase()
}

function providerLabelForStatus(provider: string): string {
  return provider
}

function getProjectLabel(input: StatusLineCommandInput): string {
  const projectName = basename(input.workspace.project_dir)
  const homeBase = basename(homedir())
  if (projectName && projectName !== homeBase) {
    return projectName
  }
  return getDisplayPath(input.workspace.current_dir)
}

function getPermissionLabel(permissionMode: PermissionMode): string {
  switch (permissionMode) {
    case 'acceptEdits':
      return 'write'
    case 'bypassPermissions':
    case 'dontAsk':
    case 'fullAccess':
      return 'full'
    case 'default':
    case 'plan':
    case 'auto':
    default:
      return 'ask'
  }
}

function getPlanGoalLabel(permissionMode: PermissionMode, modeSummary: string | null): string | null {
  if (permissionMode === 'plan') return 'plan'
  if (modeSummary && modeSummary.length > 0) return 'goal'
  return null
}

function getBackgroundTaskCount(tasks: Record<string, unknown>, remoteCount: number): number {
  let count = remoteCount
  for (const task of Object.values(tasks)) {
    if (task && typeof task === 'object' && isBackgroundTask(task as never)) {
      count++
    }
  }
  return count
}

function getMcpStatusLabel(mcpClients: Array<{ type?: string }>): string | null {
  if (mcpClients.length === 0) return null
  let connected = 0
  let failing = 0
  for (const client of mcpClients) {
    if (client.type === 'connected') connected++
    else failing++
  }
  if (failing > 0) return 'mcp !'
  return connected > 0 ? `mcp ${connected}` : null
}

function getAuthWarningLabel(provider: string): string | null {
  if (provider !== 'firstParty' && provider !== 'codex') {
    return null
  }
  const auth = getAuthTokenSource()
  if (auth.hasToken) return null
  return 'auth !'
}

function getContextUsageLabel(
  usedPercentage: number | null,
  estimated: boolean,
): string | null {
  if (usedPercentage === null) return null
  const prefix = estimated ? '~' : ''
  return `${prefix}${usedPercentage}%`
}

type CuratedStatusSegment = {
  id: string
  text: string
  kind: 'product' | 'identity' | 'token' | 'optional' | 'warning'
  priority: number
}

function truncateToWidth(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return ''
  if (stringWidth(text) <= maxWidth) return text
  if (maxWidth <= 1) return '…'

  let width = 0
  let result = ''
  for (const char of text) {
    const charWidth = stringWidth(char)
    if (width + charWidth > maxWidth - 1) {
      break
    }
    result += char
    width += charWidth
  }
  return `${result}…`
}

function getTokenDisplayText(args: {
  usedTokens: number
  contextWindowSize: number | null
  estimated: boolean
  showTokenPercentage: boolean
  usedPercentage: number | null
  tokenDetail: 'compact' | 'detailed'
  currentUsage: ReturnType<typeof getCurrentUsage>
  estimatedMarker: boolean
}): string {
  const parts = [
    `${args.estimatedMarker && args.estimated ? '~' : ''}${formatTokenCount(args.usedTokens)}${
      args.contextWindowSize ? `/${formatTokenCount(args.contextWindowSize)}` : ''
    }`,
  ]
  if (args.showTokenPercentage && args.usedPercentage !== null) {
    parts.push(`${args.estimated ? '~' : ''}${Math.max(0, Math.round(args.usedPercentage))}%`)
  }
  if (args.tokenDetail === 'detailed' && args.currentUsage) {
    const totalCache =
      args.currentUsage.cache_creation_input_tokens +
      args.currentUsage.cache_read_input_tokens
    parts.push(
      `in ${formatTokenCount(args.currentUsage.input_tokens)}`,
      `out ${formatTokenCount(args.currentUsage.output_tokens)}`,
    )
    if (totalCache > 0) {
      parts.push(`cache ${formatTokenCount(totalCache)}`)
    }
  }
  return parts.join(' ')
}

export function buildCuratedStatusLineSegments(args: {
  messages: Message[]
  input: StatusLineCommandInput
  permissionMode: PermissionMode
  effort: string
  repo: RepoStatusLineData
  prNumber: number | null
  sessionName: string | null
  sessionId: string
  taskProgress: string | null
  modeSummary: string | null
  caveConfig: ReturnType<typeof resolveCaveConfig>
  settings: ReadonlySettings
  tasks: Record<string, unknown>
  mcpClients: Array<{ type?: string }>
  remoteBackgroundTaskCount: number
  ideStatus: 'connected' | 'disconnected' | 'pending' | null
  showTokenPercentage: boolean
  tokenDetail: 'compact' | 'detailed'
  estimatedMarker: boolean
  colorIntensity: 'low' | 'normal' | 'high'
  maxWidth: number | null
}): {
  segments: CuratedStatusSegment[]
  estimated: boolean
  contextWindowSize: number | null
  usedTokens: number
} {
  const provider = getAPIProvider()
  const currentUsage = args.input.context_window.current_usage
  const estimated = currentUsage === null
  const usedTokens = currentUsage
    ? currentUsage.input_tokens
    : tokenCountWithEstimation(args.messages)
  const contextWindowSize = args.input.context_window.context_window_size

  const config = normalizeBuiltinStatusLineConfig(args.settings.statusLine)
  const maxWidth = args.maxWidth

  const productSegment: CuratedStatusSegment = {
    id: 'product',
    text: 'Tersa',
    kind: 'product',
    priority: 1,
  }

  const identityVariants = {
    full: `${providerLabelForStatus(provider)}:${args.input.model.id} ${args.effort}`,
    compact: `${args.input.model.id} ${args.effort}`,
    minimal: args.input.model.id,
  } as const

  const currentIdentityMode: keyof typeof identityVariants =
    maxWidth !== null && maxWidth < 45 ? 'minimal' : maxWidth !== null && maxWidth < 70 ? 'compact' : 'full'

  const tokenText = getTokenDisplayText({
    usedTokens,
    contextWindowSize,
    estimated,
    showTokenPercentage: config.showTokenPercentage && args.showTokenPercentage,
    usedPercentage: args.input.context_window.used_percentage,
    tokenDetail: config.tokenDetail ?? args.tokenDetail,
    currentUsage,
    estimatedMarker: config.estimatedMarker !== false && args.estimatedMarker,
  })

  const segments: CuratedStatusSegment[] = [
    productSegment,
    {
      id: 'identity',
      text: identityVariants[currentIdentityMode],
      kind: 'identity',
      priority: 2,
    },
    {
      id: 'tokens',
      text: tokenText,
      kind: 'token',
      priority: 3,
    },
  ]

  if (config.showProjectDirectory) {
    segments.push({
      id: 'project',
      text: getProjectLabel(args.input),
      kind: 'optional',
      priority: 4,
    })
  }
  if (config.showGit) {
    segments.push({
      id: 'git',
      text:
        args.repo.branch !== null
          ? `${args.repo.branch}${args.repo.branchChanges !== null ? ` +${args.repo.branchChanges}` : ''}`
          : 'git ?',
      kind: 'optional',
      priority: 5,
    })
  }
  if (config.showPermissions) {
    segments.push({
      id: 'permissions',
      text: getPermissionLabel(args.permissionMode),
      kind: 'optional',
      priority: 6,
    })
  }
  const planGoal = config.showPlanGoalMode
    ? getPlanGoalLabel(args.permissionMode, args.modeSummary)
    : null
  if (planGoal) {
    segments.push({
      id: 'plan-goal',
      text: planGoal,
      kind: 'optional',
      priority: 7,
    })
  }
  if (config.showMcp) {
    const mcpLabel = getMcpStatusLabel(args.mcpClients)
    if (mcpLabel) {
      segments.push({
        id: 'mcp',
        text: mcpLabel,
        kind: 'optional',
        priority: 8,
      })
    }
  }
  if (config.showBackgroundTasks) {
    const backgroundCount = getBackgroundTaskCount(
      args.tasks,
      args.remoteBackgroundTaskCount,
    )
    if (backgroundCount > 0) {
      segments.push({
        id: 'tasks',
        text: `${backgroundCount} task${backgroundCount === 1 ? '' : 's'}`,
        kind: 'optional',
        priority: 9,
      })
    }
  }
  if (config.showIdeContext && args.ideStatus) {
    segments.push({
      id: 'ide',
      text: args.ideStatus === 'connected' ? 'ide' : 'ide !',
      kind: 'optional',
      priority: 9,
    })
  }
  if (config.showWarnings) {
    const authWarning = getAuthWarningLabel(provider)
    if (authWarning) {
      segments.push({
        id: 'warning-auth',
        text: authWarning,
        kind: 'warning',
        priority: 10,
      })
    } else if (
      args.input.context_window.used_percentage !== null &&
      args.input.context_window.used_percentage >= 90
    ) {
      segments.push({
        id: 'warning-ctx',
        text: `ctx ${args.input.context_window.used_percentage}%`,
        kind: 'warning',
        priority: 10,
      })
    }
  }

  if (maxWidth !== null) {
    const fitted = fitCuratedStatusLineSegments(segments, maxWidth)
    return {
      segments: fitted,
      estimated,
      contextWindowSize,
      usedTokens,
    }
  }

  return {
    segments,
    estimated,
    contextWindowSize,
    usedTokens,
  }
}

function fitCuratedStatusLineSegments(
  baseSegments: CuratedStatusSegment[],
  maxWidth: number,
): CuratedStatusSegment[] {
  const cloned = baseSegments.map(segment => ({ ...segment }))
  const getWidth = (segments: CuratedStatusSegment[]) =>
    stringWidth(
      segments
        .map(segment => segment.text)
        .filter(Boolean)
        .join('  '),
    )

  const find = (id: string) => cloned.find(segment => segment.id === id)
  const remove = (id: string) => {
    const index = cloned.findIndex(segment => segment.id === id)
    if (index >= 0) cloned.splice(index, 1)
  }

  const identity = find('identity')
  const tokens = find('tokens')

  const reduceSteps = [
    () => remove('mcp'),
    () => remove('tasks'),
    () => remove('warning-auth'),
    () => remove('warning-ctx'),
    () => {
      const token = find('tokens')
      if (token && token.text.includes(' in ')) {
        const tokenCore = token.text.split(' in ')[0]
        token.text = tokenCore
      }
    },
    () => remove('project'),
    () => remove('git'),
    () => remove('plan-goal'),
    () => remove('permissions'),
    () => remove('product'),
    () => {
      if (identity) {
        identity.text = identity.text.includes(':')
          ? identity.text.split(':').slice(1).join(':')
          : identity.text
      }
    },
    () => {
      if (identity && identity.text.includes(' ')) {
        identity.text = identity.text.split(' ')[0]
      }
    },
  ]

  for (const step of reduceSteps) {
    if (getWidth(cloned) <= maxWidth) break
    step()
  }

  if (getWidth(cloned) > maxWidth) {
    const separatorWidth = cloned.length > 1 ? (cloned.length - 1) * 2 : 0
    const fixedWidth = cloned
      .filter(segment => segment.id !== 'identity')
      .reduce((sum, segment) => sum + stringWidth(segment.text), separatorWidth)
    if (identity && fixedWidth < maxWidth) {
      identity.text = truncateToWidth(identity.text, maxWidth - fixedWidth - (cloned.length > 1 ? 2 : 0))
    }
  }

  if (tokens && identity && getWidth(cloned) > maxWidth) {
    const remaining = maxWidth - stringWidth(tokens.text) - 2
    if (remaining > 0) {
      identity.text = truncateToWidth(identity.text, remaining)
    }
  }

  return cloned
}

function getCuratedSegmentTextProps(
  segment: CuratedStatusSegment,
  colorIntensity: 'low' | 'normal' | 'high',
  usedPercentage: number | null,
  themeName: ThemeName,
): React.ComponentProps<typeof Text> {
  const base: React.ComponentProps<typeof Text> = {}
  const intense = colorIntensity === 'high'
  const muted = colorIntensity === 'low'

  switch (segment.kind) {
    case 'product':
      return {
        ...base,
        dimColor: !intense,
        bold: intense,
      }
    case 'identity':
      return {
        ...base,
        color: muted ? 'text' : 'white',
        bold: colorIntensity !== 'low',
      }
    case 'token': {
      if (usedPercentage !== null) {
        if (usedPercentage >= 90) {
          return { ...base, color: 'error', bold: true }
        }
        if (usedPercentage >= 80) {
          return { ...base, color: 'warning', bold: true }
        }
        if (usedPercentage >= 60) {
          return { ...base, color: 'warning', bold: intense }
        }
      }
      return {
        ...base,
        color: intense ? 'white' : 'text',
        bold: intense,
      }
    }
    case 'warning':
      return {
        ...base,
        color: 'warning',
        bold: colorIntensity === 'high',
      }
    case 'optional':
    default:
      return {
        ...base,
        dimColor: !intense,
        color: muted ? 'text' : undefined,
      }
  }
}

function approvalModeLabel(permissionMode: PermissionMode): string {
  switch (permissionMode) {
    case 'bypassPermissions':
    case 'fullAccess':
    case 'dontAsk':
    case 'acceptEdits':
      return 'auto'
    case 'auto':
      return 'smart'
    default:
      return 'ask'
  }
}

function summarizeModes(): string | null {
  const config = getTersaModesConfig()
  const active = Object.values(config.modes).filter(mode => mode.enabled)
  if (active.length === 0) return null
  return active.map(mode => `${mode.label}:${mode.intensity}`).join(' + ')
}

function normalizeSkillCompressionStyleForDisplay(
  style: string | undefined,
): string {
  if (style === 'wenyan-lite') return 'lite'
  if (style === 'wenyan-full') return 'full'
  return style ?? 'full'
}

function summarizeTokenEfficiency(
  config: ReturnType<typeof resolveCaveConfig>,
): string {
  if (!config.enabled) return 'off'
  const active = [
    config.toolCompression && 'tool',
    config.structuredCompression && 'struct',
    config.readDeduplication && 'dedup',
    config.softHistoryCompression && 'history',
    config.repoMapInjection && 'repo',
    config.memoryRecallInjection && 'memory',
    config.rtkRewrite && 'rtk',
    config.skillPromptCompression && `skill:${normalizeSkillCompressionStyleForDisplay(config.skillPromptCompressionStyle)}`,
    config.mlCompression && 'ml',
  ].filter(Boolean)
  return `${config.intensity} ${active.join('+')}`
}

function resolveCaveConfig(settings: ReadonlySettings) {
  const live = settings.caveMode ?? {}
  const merged = {
    ...DEFAULT_CAVE_MODE_CONFIG,
    ...live,
  }
  if (merged.intensity === 'off') {
    return {
      ...merged,
      enabled: false,
    }
  }
  return merged
}

function useRepoStatusLineData(enabled: boolean) {
  const [data, setData] = useState<RepoStatusLineData>({
    branch: null,
    branchChanges: null,
  })

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function update() {
      if (!(await getIsGit())) {
        if (!cancelled) {
          setData({
            branch: null,
            branchChanges: null,
          })
        }
        return
      }

      const [{ stdout: branchStdout, code: branchCode }, defaultBranch] =
        await Promise.all([
          execFileNoThrow(gitExe(), ['rev-parse', '--abbrev-ref', 'HEAD'], {
            preserveOutputOnError: false,
          }),
          getDefaultBranch(),
        ])

      const branch =
        branchCode === 0 && branchStdout.trim() && branchStdout.trim() !== 'HEAD'
          ? branchStdout.trim()
          : null

      let branchChanges: number | null = null
      const comparableDefault = defaultBranch?.replace(/^origin\//, '')
      if (
        defaultBranch &&
        branch &&
        branch !== defaultBranch &&
        branch !== comparableDefault
      ) {
        const { stdout, code } = await execFileNoThrow(
          gitExe(),
          ['rev-list', '--count', `${defaultBranch}..HEAD`],
          { preserveOutputOnError: false },
        )
        if (code === 0) {
          const parsed = Number.parseInt(stdout.trim(), 10)
          branchChanges = Number.isFinite(parsed) ? parsed : null
        }
      }

      if (!cancelled) {
        setData({
          branch,
          branchChanges,
        })
        timeout = setTimeout(update, 60_000)
      }
    }

    void update()

    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [enabled])

  return data
}

function buildBuiltinItemValue(
  item: BuiltinStatusLineItemId,
  args: {
    input: StatusLineCommandInput
    permissionMode: PermissionMode
    effort: string
    isLoading: boolean
    fastMode: boolean
    repo: RepoStatusLineData
    prNumber: number | null
    sessionName: string | null
    sessionId: string
    taskProgress: string | null
    modeSummary: string | null
    caveConfig: ReturnType<typeof resolveCaveConfig>
  },
): string | null {
  const totalTokens =
    args.input.context_window.total_input_tokens +
    args.input.context_window.total_output_tokens
  switch (item) {
    case 'model-with-reasoning':
      return `${args.input.model.display_name} (${args.effort})`
    case 'current-dir':
      return args.input.workspace.current_dir
    case 'context-used':
      return formatPercent(args.input.context_window.used_percentage)
    case 'five-hour-limit':
      return args.input.rate_limits?.five_hour
        ? formatPercent(100 - args.input.rate_limits.five_hour.used_percentage)
        : null
    case 'weekly-limit':
      return args.input.rate_limits?.seven_day
        ? formatPercent(100 - args.input.rate_limits.seven_day.used_percentage)
        : null
    case 'used-tokens':
      return formatCompactNumber(totalTokens)
    case 'model':
      return args.input.model.display_name
    case 'reasoning':
      return args.effort
    case 'project-name':
      return basename(args.input.workspace.project_dir)
    case 'git-branch':
      return args.repo.branch
    case 'pull-request-number':
      return args.prNumber ? `#${args.prNumber}` : null
    case 'branch-changes':
      return args.repo.branchChanges !== null
        ? `${args.repo.branchChanges} commit${args.repo.branchChanges === 1 ? '' : 's'}`
        : null
    case 'run-state':
      return args.isLoading ? 'Working' : 'Ready'
    case 'permissions':
      return permissionModeTitle(args.permissionMode)
    case 'approval-mode':
      return approvalModeLabel(args.permissionMode)
    case 'context-remaining':
      return formatPercent(args.input.context_window.remaining_percentage)
    case 'codex-version':
      return `v${args.input.version}`
    case 'context-window-size':
      return formatCompactNumber(args.input.context_window.context_window_size)
    case 'total-input-tokens':
      return formatCompactNumber(args.input.context_window.total_input_tokens)
    case 'total-output-tokens':
      return formatCompactNumber(args.input.context_window.total_output_tokens)
    case 'thread-id':
      return args.sessionId
    case 'fast-mode':
      return args.fastMode ? 'on' : 'off'
    case 'raw-output':
      return null
    case 'thread-title':
      return args.sessionName ?? args.sessionId
    case 'task-progress':
      return args.taskProgress
    case 'active-modes':
      return args.modeSummary
    case 'compression-level':
      return args.caveConfig.enabled ? args.caveConfig.intensity : 'off'
    case 'token-efficiency':
      return summarizeTokenEfficiency(args.caveConfig)
    case 'session-cost':
      return `$${args.input.cost.total_cost_usd.toFixed(2)}`
    case 'session-elapsed':
      return formatDuration(args.input.cost.total_duration_ms)
  }
}

function buildBuiltinStatusLineText(
  config: BuiltinStatusLineConfig,
  args: Parameters<typeof buildBuiltinItemValue>[1],
  themeName: ThemeName,
): string {
  const themeColors = config.useThemeColors !== false
  const subtle = themeColors ? color('subtle', themeName) : (t: string) => t
  const text = themeColors ? color('text', themeName) : (t: string) => t
  const accent = themeColors
    ? color('suggestion', themeName)
    : (t: string) => t
  const success = themeColors
    ? color('success', themeName)
    : (t: string) => t
  const separator = subtle(' · ')

  const parts = config.items.flatMap(item => {
    const value = buildBuiltinItemValue(item, args)
    if (!value) return []
    const label =
      item === 'current-dir' ||
      item === 'project-name' ||
      item === 'thread-title' ||
      item === 'thread-id'
        ? subtle(`${item} `)
        : subtle(`${item} `)
    const valueText =
      item === 'run-state' && value === 'Ready'
        ? success(value)
        : item === 'run-state'
          ? accent(value)
          : text(value)
    return [`${label}${valueText}`]
  })

  return parts.join(separator)
}

export function getLastAssistantMessageId(messages: Message[]): string | null {
  return getLastAssistantMessage(messages)?.uuid ?? null
}

function StatusLineInner({
  messagesRef,
  lastAssistantMessageId,
  vimMode,
  isLoading,
}: Props): React.ReactNode {
  const abortControllerRef = useRef<AbortController | undefined>(undefined)
  const permissionMode = useAppState(s => s.toolPermissionContext.mode)
  const additionalWorkingDirectories = useAppState(
    s => s.toolPermissionContext.additionalWorkingDirectories,
  )
  const statusLineText = useAppState(s => s.statusLineText)
  const fastMode = useAppState(s => s.fastMode ?? false)
  const effortValue = useAppState(s => s.effortValue)
  const tasks = useAppState(s => s.tasks)
  const setAppState = useSetAppState()
  const settings = useSettings()
  const [themeName] = useTheme()
  const { addNotification } = useNotifications()
  const mainLoopModel = useMainLoopModel()
  const { columns } = useTerminalSize()
  const mcpClients = useAppState(s => s.mcp.clients)
  const remoteBackgroundTaskCount = useAppState(
    s => s.remoteBackgroundTaskCount,
  )
  const ideConnection = useIdeConnectionStatus(mcpClients)
  const builtinConfig =
    settings.statusLine?.type === 'builtin' ? settings.statusLine : undefined
  const normalizedBuiltinConfig = builtinConfig
    ? normalizeBuiltinStatusLineConfig(builtinConfig)
    : undefined
  const repoData = useRepoStatusLineData(
    normalizedBuiltinConfig?.showGit ?? false,
  )

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const vimModeRef = useRef(vimMode)
  vimModeRef.current = vimMode
  const permissionModeRef = useRef(permissionMode)
  permissionModeRef.current = permissionMode
  const addedDirsRef = useRef(additionalWorkingDirectories)
  addedDirsRef.current = additionalWorkingDirectories
  const mainLoopModelRef = useRef(mainLoopModel)
  mainLoopModelRef.current = mainLoopModel

  const previousStateRef = useRef<{
    messageId: string | null
    exceeds200kTokens: boolean
    permissionMode: PermissionMode
    vimMode: VimMode | undefined
    mainLoopModel: ModelName
  }>({
    messageId: null,
    exceeds200kTokens: false,
    permissionMode,
    vimMode,
    mainLoopModel,
  })

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const logNextResultRef = useRef(true)

  const doUpdate = useCallback(async () => {
    if (settingsRef.current.statusLine?.type !== 'command') {
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const msgs = messagesRef.current
    const logResult = logNextResultRef.current
    logNextResultRef.current = false
    try {
      let exceeds200kTokens = previousStateRef.current.exceeds200kTokens
      const currentMessageId = getLastAssistantMessageId(msgs)
      if (currentMessageId !== previousStateRef.current.messageId) {
        exceeds200kTokens = doesMostRecentAssistantMessageExceed200k(msgs)
        previousStateRef.current.messageId = currentMessageId
        previousStateRef.current.exceeds200kTokens = exceeds200kTokens
      }

      const statusInput = buildStatusLineCommandInput(
        permissionModeRef.current,
        exceeds200kTokens,
        settingsRef.current,
        msgs,
        Array.from(addedDirsRef.current.keys()),
        mainLoopModelRef.current,
        vimModeRef.current,
      )
      const text = await executeStatusLineCommand(
        statusInput,
        controller.signal,
        undefined,
        logResult,
      )
      if (!controller.signal.aborted) {
        setAppState(prev => {
          if (prev.statusLineText === text) return prev
          return {
            ...prev,
            statusLineText: text,
          }
        })
      }
    } catch {
      // ignore
    }
  }, [messagesRef, setAppState])

  const scheduleUpdate = useCallback(() => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout((ref, updateFn) => {
      ref.current = undefined
      void updateFn()
    }, 300, debounceTimerRef, doUpdate)
  }, [doUpdate])

  useEffect(() => {
    if (settings.statusLine?.type !== 'command') return
    if (
      lastAssistantMessageId !== previousStateRef.current.messageId ||
      permissionMode !== previousStateRef.current.permissionMode ||
      vimMode !== previousStateRef.current.vimMode ||
      mainLoopModel !== previousStateRef.current.mainLoopModel
    ) {
      previousStateRef.current.permissionMode = permissionMode
      previousStateRef.current.vimMode = vimMode
      previousStateRef.current.mainLoopModel = mainLoopModel
      scheduleUpdate()
    }
  }, [
    lastAssistantMessageId,
    permissionMode,
    vimMode,
    mainLoopModel,
    scheduleUpdate,
    settings.statusLine?.type,
  ])

  const statusLineCommand =
    settings?.statusLine?.type === 'command'
      ? settings.statusLine.command
      : undefined
  const isFirstSettingsRender = useRef(true)
  useEffect(() => {
    if (settings.statusLine?.type !== 'command') return
    if (isFirstSettingsRender.current) {
      isFirstSettingsRender.current = false
      return
    }
    logNextResultRef.current = true
    void doUpdate()
  }, [statusLineCommand, doUpdate, settings.statusLine?.type])

  useEffect(() => {
    const statusLine = settings?.statusLine
    if (!statusLine) return
    if (statusLine.type === 'command') {
      logEvent('tengu_status_line_mount', {
        command_length: statusLine.command.length,
        padding: statusLine.padding,
      })
      if (settings.disableAllHooks === true) {
        logForDebugging(
          'Status line is configured but disableAllHooks is true',
          { level: 'warn' },
        )
      }
      if (!checkHasTrustDialogAccepted()) {
        addNotification({
          key: 'statusline-trust-blocked',
          text: 'statusline skipped · restart to fix',
          color: 'warning',
          priority: 'low',
        })
        logForDebugging(
          'Status line command skipped: workspace trust not accepted',
          { level: 'warn' },
        )
      }
      return
    }
    logEvent('tengu_status_line_mount', {
      command_length: 0,
      padding: statusLine.padding,
    })
  }, [addNotification, settings])

  useEffect(() => {
    if (settings.statusLine?.type === 'command') {
      void doUpdate()
    }
    return () => {
      abortControllerRef.current?.abort()
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [doUpdate, settings.statusLine?.type])

  const paddingX = settings?.statusLine?.padding ?? 0

  if (normalizedBuiltinConfig) {
    const msgs = messagesRef.current
    const exceeds200kTokens = doesMostRecentAssistantMessageExceed200k(msgs)
    const input = buildStatusLineCommandInput(
      permissionMode,
      exceeds200kTokens,
      settings,
      msgs,
      Array.from(additionalWorkingDirectories.keys()),
      mainLoopModel,
      vimMode,
    )
    const runtimeModel = getRuntimeMainLoopModel({
      permissionMode,
      mainLoopModel,
      exceeds200kTokens,
    })
    const sessionId = getSessionId()
    const sessionName = getCurrentSessionTitle(sessionId)
    const taskProgress =
      Object.values(tasks).find(
        task => task.status === 'running' || task.status === 'pending',
      )?.description ?? null
    const curated = buildCuratedStatusLineSegments({
      messages: msgs,
      input,
      permissionMode,
      effort: getDisplayedEffortLevel(runtimeModel, effortValue),
      isLoading,
      fastMode: isFastModeEnabled() ? fastMode : false,
      repo: repoData,
      prNumber: null,
      sessionName,
      sessionId,
      taskProgress,
      modeSummary: summarizeModes(),
      caveConfig: resolveCaveConfig(settings),
      settings,
      tasks,
      mcpClients,
      remoteBackgroundTaskCount,
      ideStatus: ideConnection.status,
      showTokenPercentage: normalizedBuiltinConfig.showTokenPercentage ?? false,
      tokenDetail: normalizedBuiltinConfig.tokenDetail ?? 'compact',
      estimatedMarker: normalizedBuiltinConfig.estimatedMarker !== false,
      colorIntensity: normalizedBuiltinConfig.colorIntensity ?? 'normal',
      maxWidth: columns ? Math.max(0, columns - paddingX * 2 - 2) : null,
    })

    const separator = <Text dimColor>  </Text>

    return (
      <Box paddingX={paddingX} gap={0}>
        {curated.segments.length > 0 ? (
          curated.segments.map((segment, index) => {
            const props = getCuratedSegmentTextProps(
              segment,
              normalizedBuiltinConfig.colorIntensity ?? 'normal',
              input.context_window.used_percentage,
              themeName,
            )
            return (
              <React.Fragment key={segment.id}>
                {index > 0 ? separator : null}
                <Text {...props}>{segment.text}</Text>
              </React.Fragment>
            )
          })
        ) : isFullscreenEnvEnabled() ? (
          <Text> </Text>
        ) : null}
      </Box>
    )
  }

  return (
    <Box paddingX={paddingX} gap={2}>
      {statusLineText ? (
        <Text dimColor wrap="truncate">
          <Ansi>{statusLineText}</Ansi>
        </Text>
      ) : isFullscreenEnvEnabled() ? (
        <Text> </Text>
      ) : null}
    </Box>
  )
}

export const StatusLine = memo(StatusLineInner)
