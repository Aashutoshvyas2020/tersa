import { describe, expect, test } from 'bun:test'
import { isModeManagedPromptCommand } from './overlap.js'
import type { Command } from '../../commands.js'

function promptCommand(name: string, description = ''): Command {
  return {
    type: 'prompt',
    name,
    description,
    hasUserSpecifiedDescription: true,
    contentLength: 0,
    progressMessage: 'running',
    source: 'builtin',
    loadedFrom: 'skills',
    getPromptForCommand: async () => [{ type: 'text', text: '' }],
  }
}

describe('mode-managed prompt overlap filtering', () => {
  test('matches curated superpowers names', () => {
    expect(
      isModeManagedPromptCommand(
        promptCommand('writing-plans', 'plan creation workflow'),
      ),
    ).toBe(true)
  })

  test('matches gsd-prefixed skills', () => {
    expect(isModeManagedPromptCommand(promptCommand('gsd-debug'))).toBe(true)
  })

  test('matches karpathy plugin prompt', () => {
    expect(
      isModeManagedPromptCommand(
        promptCommand('karpathy-guidelines', 'karpathy guardrails'),
      ),
    ).toBe(true)
  })

  test('matches designer taste skill prompts', () => {
    expect(
      isModeManagedPromptCommand(
        promptCommand('design-taste-frontend', 'frontend design taste guide'),
      ),
    ).toBe(true)
  })

  test('keeps ordinary skills visible', () => {
    expect(
      isModeManagedPromptCommand(
        promptCommand('deploy-preview', 'deploy preview environment'),
      ),
    ).toBe(false)
  })
})
