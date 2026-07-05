import { describe, expect, test } from 'bun:test'
import { homedir } from 'os'
import {
  buildCuratedStatusLineSegments,
  getAuthWarningLabel,
  getCuratedSegmentTextProps,
} from './StatusLine.js'
import { getDefaultBuiltinStatusLineConfig } from './statusline/statusLineConfig.js'
import { DEFAULT_CAVE_MODE_CONFIG } from '../utils/caveMode/config.js'
import { stringWidth } from '../ink/stringWidth.js'

function buildSegments(args: {
  currentDir: string
  projectDir: string
  worktreeOriginalCwd?: string
  messages?: any[]
  currentUsage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  } | null
  showTokenPercentage?: boolean
  tokenDetail?: 'compact' | 'detailed'
  showWarnings?: boolean
  showBackgroundTasks?: boolean
  tasks?: Record<string, unknown>
  remoteBackgroundTaskCount?: number
  maxWidth?: number
  usedPercentage?: number
  showGit?: boolean
}) {
  const { segments } = buildCuratedStatusLineSegments({
    messages: args.messages ?? [],
    input: {
      model: {
        id: 'gpt-5.4-mini',
        display_name: 'GPT-5.4 mini',
      },
      workspace: {
        current_dir: args.currentDir,
        project_dir: args.projectDir,
        added_dirs: [],
      },
      version: '0.16.1',
      output_style: { name: 'default' },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 0,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0,
      },
      context_window: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        context_window_size: 400_000,
        current_usage: args.currentUsage ?? null,
        used_percentage: args.usedPercentage ?? 0,
        remaining_percentage: 100 - (args.usedPercentage ?? 0),
      },
      exceeds_200k_tokens: false,
      ...(args.worktreeOriginalCwd
        ? {
            worktree: {
              name: 'agent-test',
              path: args.currentDir,
              branch: 'worktree-agent-test',
              original_cwd: args.worktreeOriginalCwd,
              original_branch: 'main',
            },
          }
        : {}),
    },
    permissionMode: 'default',
    effort: 'high',
    repo: {
      branch: args.showGit ? 'feature/status-priority' : null,
      branchChanges: args.showGit ? 3 : null,
    },
    prNumber: null,
    sessionName: null,
    sessionId: 'session-test',
    taskProgress: null,
    modeSummary: null,
    caveConfig: {
      ...DEFAULT_CAVE_MODE_CONFIG,
      enabled: false,
      intensity: 'off',
      toolCompression: false,
      structuredCompression: false,
      readDeduplication: false,
      softHistoryCompression: false,
      repoMapInjection: false,
      memoryRecallInjection: false,
      rtkRewrite: false,
      skillPromptCompression: false,
      mlCompression: false,
    },
    settings: {
      statusLine: {
        ...getDefaultBuiltinStatusLineConfig(),
        showGit: args.showGit ?? false,
        showPermissions: false,
        showPlanGoalMode: false,
        showWarnings: args.showWarnings ?? false,
        showBackgroundTasks: args.showBackgroundTasks ?? false,
        showTokenPercentage: args.showTokenPercentage ?? false,
        tokenDetail: args.tokenDetail ?? 'compact',
      },
    } as any,
    tasks: args.tasks ?? {},
    mcpClients: [],
    remoteBackgroundTaskCount: args.remoteBackgroundTaskCount ?? 0,
    ideStatus: null,
    showTokenPercentage: args.showTokenPercentage ?? false,
    tokenDetail: args.tokenDetail ?? 'compact',
    estimatedMarker: true,
    colorIntensity: 'normal',
    maxWidth: args.maxWidth ?? 120,
  })

  return segments
}

describe('StatusLine product wordmark', () => {
  test('keeps the silver Tersa wordmark bold at normal intensity', () => {
    expect(
      getCuratedSegmentTextProps(
        { id: 'product', text: 'Tersa', kind: 'product', priority: 1 },
        'normal',
        null,
        undefined as never,
      ),
    ).toMatchObject({ bold: true, dimColor: true })
  })
})

describe('StatusLine project label', () => {
  test('prefers stable repo root over internal worktree path', () => {
    const segment = buildSegments({
      currentDir: '/Users/aashu/tersa/.claude/worktrees/agent-12345678',
      projectDir: '/Users/aashu',
      worktreeOriginalCwd: '/Users/aashu/tersa',
    }).find(segment => segment.id === 'project')

    expect(segment?.text).toBe('tersa')
  })

  test('never shows internal .claude worktree path when launched from home', () => {
    const home = homedir()
    const segment = buildSegments({
      currentDir: `${home}/.claude/worktrees/agent-12345678`,
      projectDir: home,
      worktreeOriginalCwd: home,
    }).find(segment => segment.id === 'project')

    expect(segment?.text).toBe('~')
  })
})

describe('StatusLine token segment', () => {
  test('falls back to estimated token usage when provider reports zero usage', () => {
    const tokenSegment = buildSegments({
      currentDir: '/Users/aashu/tersa',
      projectDir: '/Users/aashu/tersa',
      messages: [
        {
          type: 'assistant',
          message: {
            content: 'A fairly long response that should estimate to non-zero tokens in the footer.',
          },
        },
      ],
      currentUsage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      showTokenPercentage: true,
      tokenDetail: 'detailed',
    }).find(segment => segment.id === 'tokens')

    expect(tokenSegment?.text.startsWith('~')).toBe(true)
    expect(tokenSegment?.text).not.toContain('in 0')
    expect(tokenSegment?.text).not.toContain('out 0')
  })

  test('uses full current usage total when provider reports it', () => {
    const tokenSegment = buildSegments({
      currentDir: '/Users/aashu/tersa',
      projectDir: '/Users/aashu/tersa',
      currentUsage: {
        input_tokens: 1000,
        output_tokens: 250,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 150,
      },
      showTokenPercentage: true,
      tokenDetail: 'detailed',
    }).find(segment => segment.id === 'tokens')

    expect(tokenSegment?.text).toContain('1.5k/400k')
    expect(tokenSegment?.text).toContain('in 1k')
    expect(tokenSegment?.text).toContain('out 250')
    expect(tokenSegment?.text).toContain('cache 250')
  })

  test('keeps token percentage visible within every supported narrow width', () => {
    for (const maxWidth of [40, 60, 80]) {
      const segments = buildSegments({
        currentDir: '/Users/aashu/tersa',
        projectDir: '/Users/aashu/tersa',
        currentUsage: {
          input_tokens: 40_000,
          output_tokens: 2_000,
          cache_creation_input_tokens: 1_000,
          cache_read_input_tokens: 1_000,
        },
        showTokenPercentage: true,
        tokenDetail: 'detailed',
        maxWidth,
      })
      const tokenSegment = segments.find(segment => segment.id === 'tokens')
      const rendered = segments.map(segment => segment.text).join('  ')

      expect(tokenSegment).toBeDefined()
      expect(tokenSegment?.text).toContain('%')
      expect(stringWidth(rendered)).toBeLessThanOrEqual(maxWidth)
    }
  })
})

describe('StatusLine runtime activity', () => {
  test('shows subagent deployment count', () => {
    const taskSegment = buildSegments({
      currentDir: '/Users/aashu/tersa',
      projectDir: '/Users/aashu/tersa',
      showBackgroundTasks: true,
      tasks: {
        a: { type: 'local_agent', status: 'running', description: 'audit' },
        b: { type: 'remote_agent', status: 'pending', description: 'review' },
      },
    }).find(segment => segment.id === 'tasks')

    expect(taskSegment?.text).toBe('2 subagents deployed')
  })

  test('shows long command polling state', () => {
    const taskSegment = buildSegments({
      currentDir: '/Users/aashu/tersa',
      projectDir: '/Users/aashu/tersa',
      showBackgroundTasks: true,
      tasks: {
        shell: { type: 'local_bash', status: 'running', description: 'test' },
      },
    }).find(segment => segment.id === 'tasks')

    expect(taskSegment?.text).toBe('waiting for long command output')
  })
})

describe('StatusLine warnings', () => {
  test('does not show auth warning for codex when codex credentials are present', () => {
    const previousEnv = {
      CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      CHATGPT_ACCOUNT_ID: process.env.CHATGPT_ACCOUNT_ID,
      CODEX_API_KEY: process.env.CODEX_API_KEY,
      CODEX_ACCOUNT_ID: process.env.CODEX_ACCOUNT_ID,
    }

    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = 'https://chatgpt.com/backend-api/codex'
    process.env.OPENAI_MODEL = 'codexplan'
    process.env.CHATGPT_ACCOUNT_ID = 'acct_test'
    process.env.CODEX_API_KEY = 'codex-test'
    delete process.env.CODEX_ACCOUNT_ID

    try {
      expect(getAuthWarningLabel('codex')).toBeNull()
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key as keyof typeof previousEnv]
        } else {
          process.env[key as keyof typeof previousEnv] = value
        }
      }
    }
  })

  test('preserves warnings and tokens before project and git context', () => {
    const previousEnv = {
      CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      CHATGPT_ACCOUNT_ID: process.env.CHATGPT_ACCOUNT_ID,
      CODEX_API_KEY: process.env.CODEX_API_KEY,
      CODEX_ACCOUNT_ID: process.env.CODEX_ACCOUNT_ID,
    }

    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = 'https://chatgpt.com/backend-api/codex'
    process.env.OPENAI_MODEL = 'codexplan'
    process.env.CHATGPT_ACCOUNT_ID = 'acct_test'
    process.env.CODEX_API_KEY = 'codex-test'
    delete process.env.CODEX_ACCOUNT_ID

    try {
      const segments = buildSegments({
        currentDir: '/Users/aashu/tersa',
        projectDir: '/Users/aashu/tersa',
        currentUsage: {
          input_tokens: 370_000,
          output_tokens: 10_000,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        usedPercentage: 95,
        showWarnings: true,
        showGit: true,
        showTokenPercentage: true,
        tokenDetail: 'detailed',
        maxWidth: 40,
      })
      const rendered = segments.map(segment => segment.text).join('  ')

      expect(segments.some(segment => segment.id === 'tokens')).toBe(true)
      expect(segments.some(segment => segment.kind === 'warning')).toBe(true)
      expect(segments.some(segment => segment.id === 'project')).toBe(false)
      expect(segments.some(segment => segment.id === 'git')).toBe(false)
      expect(stringWidth(rendered)).toBeLessThanOrEqual(40)
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key as keyof typeof previousEnv]
        } else {
          process.env[key as keyof typeof previousEnv] = value
        }
      }
    }
  })
})
