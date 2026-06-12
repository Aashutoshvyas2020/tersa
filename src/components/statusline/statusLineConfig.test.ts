import { describe, expect, test } from 'bun:test'
import {
  cycleBuiltinStatusLineChoice,
  getDefaultBuiltinStatusLineConfig,
  normalizeBuiltinStatusLineConfig,
  toggleBuiltinStatusLineBoolean,
} from './statusLineConfig.js'

describe('builtin status line config', () => {
  test('defaults to the curated v1 layout', () => {
    const config = getDefaultBuiltinStatusLineConfig()
    expect(config.enabled).toBe(true)
    expect(config.showProviderModelEffort).toBe(true)
    expect(config.showProjectDirectory).toBe(true)
    expect(config.showGit).toBe(true)
    expect(config.showPermissions).toBe(true)
    expect(config.showPlanGoalMode).toBe(true)
    expect(config.showMcp).toBe(false)
    expect(config.showBackgroundTasks).toBe(false)
    expect(config.showWarnings).toBe(true)
    expect(config.showIdeContext).toBe(false)
    expect(config.showTokenPercentage).toBe(false)
    expect(config.tokenDetail).toBe('compact')
    expect(config.estimatedMarker).toBe(true)
    expect(config.colorIntensity).toBe('normal')
  })

  test('migrates legacy item lists into the curated toggles', () => {
    const config = normalizeBuiltinStatusLineConfig({
      type: 'builtin',
      items: ['current-dir', 'git-branch', 'task-progress', 'context-used'],
    } as any)

    expect(config.showProjectDirectory).toBe(true)
    expect(config.showGit).toBe(true)
    expect(config.showBackgroundTasks).toBe(true)
    expect(config.showTokenPercentage).toBe(true)
  })

  test('toggles and cycles the curated rows without exposing legacy values', () => {
    const toggled = toggleBuiltinStatusLineBoolean(
      getDefaultBuiltinStatusLineConfig(),
      'showMcp',
    )
    expect(toggled.showMcp).toBe(true)

    const cycled = cycleBuiltinStatusLineChoice(
      getDefaultBuiltinStatusLineConfig(),
      'tokenDetail',
      1,
    )
    expect(cycled.tokenDetail).toBe('detailed')
  })
})
