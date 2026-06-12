import type { Command } from '../../commands.js'

const SUPERPOWERS_NAMES = new Set([
  'using-superpowers',
  'brainstorming',
  'writing-plans',
  'subagent-driven-development',
  'test-driven-development',
  'systematic-debugging',
  'verification-before-completion',
  'requesting-code-review',
  'dispatching-parallel-agents',
  'executing-plans',
  'using-git-worktrees',
])

const DESIGN_SKILL_NAMES = new Set([
  'design-taste-frontend',
  'stitch-design-taste',
  'frontend-design',
  'frontend-skill',
  'redesign-existing-projects',
  'redesign',
  'high-end-visual-design',
  'minimalist-ui',
  'ui-craft',
  'design-system',
  'design-taste',
  'taste-skill',
])

export function isModeManagedPromptCommand(cmd: Command): boolean {
  if (cmd.type !== 'prompt') return false

  const name = cmd.name.toLowerCase()
  const pluginName = cmd.pluginInfo?.pluginManifest.name?.toLowerCase() ?? ''
  const description = (cmd.description ?? '').toLowerCase()

  if (name.startsWith('gsd-') || pluginName.includes('get-shit-done')) {
    return true
  }

  if (
    name === 'karpathy-guidelines' ||
    pluginName.includes('karpathy') ||
    description.includes('karpathy')
  ) {
    return true
  }

  if (
    DESIGN_SKILL_NAMES.has(name) ||
    pluginName.includes('taste-skill') ||
    pluginName.includes('design') ||
    description.includes('design-taste') ||
    description.includes('design system') ||
    description.includes('ui craft') ||
    description.includes('frontend design')
  ) {
    return true
  }

  if (
    SUPERPOWERS_NAMES.has(name) ||
    pluginName.includes('superpowers') ||
    description.includes('superpowers')
  ) {
    return true
  }

  return false
}
