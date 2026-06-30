import {
  BUILTIN_STATUS_LINE_COLOR_INTENSITIES,
  BUILTIN_STATUS_LINE_TOKEN_DETAILS,
  type BuiltinStatusLineColorIntensity,
  type BuiltinStatusLineConfig,
  type BuiltinStatusLineItemId,
  type BuiltinStatusLineTokenDetail,
} from '../../types/statusLine.js'

export const DEFAULT_BUILTIN_STATUSLINE_CONFIG: BuiltinStatusLineConfig = {
  type: 'builtin',
  enabled: true,
  showProviderModelEffort: true,
  showProjectDirectory: true,
  showGit: true,
  showPermissions: true,
  showPlanGoalMode: true,
  showMcp: false,
  showBackgroundTasks: true,
  showWarnings: true,
  showIdeContext: false,
  showTokenPercentage: true,
  tokenDetail: 'compact',
  estimatedMarker: true,
  colorIntensity: 'normal',
  useThemeColors: true,
  padding: 0,
}

const LEGACY_ITEM_FLAGS: Record<
  BuiltinStatusLineItemId,
  Partial<Pick<BuiltinStatusLineConfig, 'showProviderModelEffort' | 'showProjectDirectory' | 'showGit' | 'showPermissions' | 'showPlanGoalMode' | 'showMcp' | 'showBackgroundTasks' | 'showWarnings' | 'showIdeContext' | 'showTokenPercentage'>>
> = {
  'model-with-reasoning': { showProviderModelEffort: true },
  'current-dir': { showProjectDirectory: true },
  'context-used': { showTokenPercentage: true },
  'five-hour-limit': { showWarnings: true },
  'weekly-limit': { showWarnings: true },
  'used-tokens': {},
  model: { showProviderModelEffort: true },
  reasoning: { showProviderModelEffort: true },
  'project-name': { showProjectDirectory: true },
  'git-branch': { showGit: true },
  'pull-request-number': { showGit: true },
  'branch-changes': { showGit: true },
  'run-state': {},
  permissions: { showPermissions: true },
  'approval-mode': { showPermissions: true },
  'context-remaining': { showTokenPercentage: true },
  'codex-version': {},
  'context-window-size': { showTokenPercentage: true },
  'total-input-tokens': { showTokenPercentage: true },
  'total-output-tokens': { showTokenPercentage: true },
  'thread-id': {},
  'fast-mode': {},
  'raw-output': {},
  'thread-title': {},
  'task-progress': { showBackgroundTasks: true },
  'active-modes': { showPlanGoalMode: true },
  'compression-level': { showTokenPercentage: true },
  'token-efficiency': { showTokenPercentage: true },
  'session-cost': {},
  'session-elapsed': {},
}

function sanitizeTokenDetail(
  value: BuiltinStatusLineTokenDetail | undefined,
): BuiltinStatusLineTokenDetail {
  return value === 'detailed' ? 'detailed' : 'compact'
}

function sanitizeColorIntensity(
  value: BuiltinStatusLineColorIntensity | undefined,
): BuiltinStatusLineColorIntensity {
  return value === 'low' || value === 'high' ? value : 'normal'
}

export function normalizeBuiltinStatusLineConfig(
  config: BuiltinStatusLineConfig | undefined,
): BuiltinStatusLineConfig {
  const base = { ...DEFAULT_BUILTIN_STATUSLINE_CONFIG, ...(config ?? {}) }
  const items = config?.items ?? []

  if (items.length > 0) {
    for (const item of items) {
      const flag = LEGACY_ITEM_FLAGS[item]
      if (!flag) continue
      Object.assign(base, flag)
    }
  }

  return {
    ...base,
    enabled: base.enabled !== false,
    showTokenPercentage: true,
    tokenDetail: sanitizeTokenDetail(base.tokenDetail),
    colorIntensity: sanitizeColorIntensity(base.colorIntensity),
    useThemeColors: base.useThemeColors !== false,
    padding: base.padding ?? 0,
  }
}

export function getDefaultBuiltinStatusLineConfig(): BuiltinStatusLineConfig {
  return normalizeBuiltinStatusLineConfig(DEFAULT_BUILTIN_STATUSLINE_CONFIG)
}

export function toggleBuiltinStatusLineBoolean(
  config: BuiltinStatusLineConfig,
  key:
    | 'enabled'
    | 'showProviderModelEffort'
    | 'showProjectDirectory'
    | 'showGit'
    | 'showPermissions'
    | 'showPlanGoalMode'
    | 'showMcp'
    | 'showBackgroundTasks'
    | 'showWarnings'
    | 'showIdeContext'
    | 'showTokenPercentage'
    | 'estimatedMarker',
): BuiltinStatusLineConfig {
  const normalized = normalizeBuiltinStatusLineConfig(config)
  if (key === 'showTokenPercentage') {
    return normalized
  }
  return {
    ...normalized,
    [key]: !normalized[key],
  }
}

export function cycleBuiltinStatusLineChoice(
  config: BuiltinStatusLineConfig,
  key: 'tokenDetail' | 'colorIntensity',
  direction: -1 | 1,
): BuiltinStatusLineConfig {
  const normalized = normalizeBuiltinStatusLineConfig(config)
  if (key === 'tokenDetail') {
    const options = BUILTIN_STATUS_LINE_TOKEN_DETAILS
    const current = normalized.tokenDetail ?? options[0]
    const currentIndex = options.indexOf(current)
    const nextIndex =
      (currentIndex + direction + options.length) % options.length
    return {
      ...normalized,
      tokenDetail: options[nextIndex],
    }
  }
  const options = BUILTIN_STATUS_LINE_COLOR_INTENSITIES
  const current = normalized.colorIntensity ?? options[0]
  const currentIndex = options.indexOf(current)
  const nextIndex =
    (currentIndex + direction + options.length) % options.length
  return {
    ...normalized,
    colorIntensity: options[nextIndex],
  }
}
