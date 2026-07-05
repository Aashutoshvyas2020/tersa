import { expect, test } from 'bun:test'
import { getBuiltInAgents } from './builtInAgents.js'
import { EXPLORE_AGENT } from './built-in/exploreAgent.js'
import { PLAN_AGENT } from './built-in/planAgent.js'
import { VERIFICATION_AGENT } from './built-in/verificationAgent.js'

test('built-in registry loads and exposes the Tersa expert', () => {
  const names = getBuiltInAgents().map(agent => agent.agentType)

  expect(names).toContain('general-purpose')
  expect(names).toContain('statusline-setup')
  expect(names).toContain('tersa-agent')
  expect(names).not.toContain('claude-code-guide')
})

test('feature-gated worker profiles remain valid execution agents', () => {
  expect(EXPLORE_AGENT.agentType).toBe('Explore')
  expect(PLAN_AGENT.agentType).toBe('Plan')
  expect(VERIFICATION_AGENT.agentType).toBe('verification')
  expect(Array.isArray(EXPLORE_AGENT.disallowedTools)).toBe(true)
  expect(Array.isArray(PLAN_AGENT.disallowedTools)).toBe(true)
  expect(Array.isArray(VERIFICATION_AGENT.disallowedTools)).toBe(true)
})
