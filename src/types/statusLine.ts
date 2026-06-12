export const BUILTIN_STATUS_LINE_ITEM_IDS = [
  'model-with-reasoning',
  'current-dir',
  'context-used',
  'five-hour-limit',
  'weekly-limit',
  'used-tokens',
  'model',
  'reasoning',
  'project-name',
  'git-branch',
  'pull-request-number',
  'branch-changes',
  'run-state',
  'permissions',
  'approval-mode',
  'context-remaining',
  'codex-version',
  'context-window-size',
  'total-input-tokens',
  'total-output-tokens',
  'thread-id',
  'fast-mode',
  'raw-output',
  'thread-title',
  'task-progress',
  'active-modes',
  'compression-level',
  'token-efficiency',
  'session-cost',
  'session-elapsed',
] as const

export type BuiltinStatusLineItemId =
  (typeof BUILTIN_STATUS_LINE_ITEM_IDS)[number]

export const BUILTIN_STATUS_LINE_TOKEN_DETAILS = [
  'compact',
  'detailed',
] as const

export type BuiltinStatusLineTokenDetail =
  (typeof BUILTIN_STATUS_LINE_TOKEN_DETAILS)[number]

export const BUILTIN_STATUS_LINE_COLOR_INTENSITIES = [
  'low',
  'normal',
  'high',
] as const

export type BuiltinStatusLineColorIntensity =
  (typeof BUILTIN_STATUS_LINE_COLOR_INTENSITIES)[number]

export type CommandStatusLineConfig = {
  type: 'command'
  command: string
  padding?: number
}

export type BuiltinStatusLineConfig = {
  type: 'builtin'
  enabled?: boolean
  showProviderModelEffort?: boolean
  showProjectDirectory?: boolean
  showGit?: boolean
  showPermissions?: boolean
  showPlanGoalMode?: boolean
  showMcp?: boolean
  showBackgroundTasks?: boolean
  showWarnings?: boolean
  showIdeContext?: boolean
  showTokenPercentage?: boolean
  tokenDetail?: BuiltinStatusLineTokenDetail
  estimatedMarker?: boolean
  colorIntensity?: BuiltinStatusLineColorIntensity
  /**
   * Legacy item list support. Existing configs can still load, but the new
   * curated toggles are the real v1 surface.
   */
  items?: BuiltinStatusLineItemId[]
  useThemeColors?: boolean
  padding?: number
}

export type StatusLineConfig =
  | CommandStatusLineConfig
  | BuiltinStatusLineConfig

export type StatusLineCommandInput = {
  session_name?: string
  model: {
    id: string
    display_name: string
  }
  workspace: {
    current_dir: string
    project_dir: string
    added_dirs: string[]
  }
  version: string
  output_style: {
    name: string
  }
  cost: {
    total_cost_usd: number
    total_duration_ms: number
    total_api_duration_ms: number
    total_lines_added: number
    total_lines_removed: number
  }
  context_window: {
    total_input_tokens: number
    total_output_tokens: number
    context_window_size: number | null
    current_usage: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens: number
      cache_read_input_tokens: number
    } | null
    used_percentage: number | null
    remaining_percentage: number | null
  }
  exceeds_200k_tokens: boolean
  rate_limits?: {
    five_hour?: {
      used_percentage: number
      resets_at: string
    }
    seven_day?: {
      used_percentage: number
      resets_at: string
    }
  }
  vim?: {
    mode: string
  }
  agent?: {
    name: string
  }
  remote?: {
    session_id: string
  }
  worktree?: {
    name: string
    path: string
    branch: string
    original_cwd: string
    original_branch: string
  }
} & Record<string, unknown>
