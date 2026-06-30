import { describe, expect, test } from 'bun:test'
import * as React from 'react'
import { stringWidth } from '../ink/stringWidth.js'
import type { ContextData } from '../utils/analyzeContext.js'
import { renderToString } from '../utils/staticRender.js'
import {
  buildCapacityBar,
  buildContextOverview,
  ContextVisualization,
} from './ContextVisualization.js'

function contextData(): ContextData {
  return {
    categories: [
      { name: 'Messages', tokens: 310_000, color: 'text' },
      { name: 'System prompt', tokens: 12_000, color: 'promptBorder' },
      { name: 'MCP tools', tokens: 9_000, color: 'text' },
      { name: 'Memory files', tokens: 6_000, color: 'text' },
      { name: 'Skills', tokens: 3_000, color: 'warning' },
      {
        name: 'MCP tools (deferred)',
        tokens: 18_000,
        color: 'inactive',
        isDeferred: true,
      },
      { name: 'Autocompact buffer', tokens: 33_000, color: 'inactive' },
      { name: 'Free space', tokens: 27_000, color: 'promptBorder' },
    ],
    totalTokens: 340_000,
    maxTokens: 367_000,
    rawMaxTokens: 400_000,
    percentage: 85,
    gridRows: [],
    model: 'gpt-5.5',
    memoryFiles: [
      { path: '/Users/aashu/tersa/CLAUDE.md', type: 'project', tokens: 4_000 },
      { path: '/Users/aashu/.claude/CLAUDE.md', type: 'user', tokens: 2_000 },
    ],
    mcpTools: [
      { name: 'read', serverName: 'devspace', tokens: 4_000, isLoaded: true },
      { name: 'write', serverName: 'devspace', tokens: 5_000, isLoaded: false },
    ],
    agents: [],
    skills: {
      totalSkills: 12,
      includedSkills: 5,
      tokens: 3_000,
      skillFrontmatter: [],
    },
    autoCompactThreshold: 367_000,
    isAutoCompactEnabled: true,
    messageBreakdown: {
      toolCallTokens: 1_000,
      toolResultTokens: 18_000,
      attachmentTokens: 0,
      assistantMessageTokens: 25_000,
      userMessageTokens: 26_000,
      toolCallsByType: [
        { name: 'Bash', callTokens: 1_000, resultTokens: 17_000 },
      ],
      attachmentsByType: [],
    },
    apiUsage: null,
  }
}

describe('context overview', () => {
  test('ranks active contributors and separates reserve and deferred tokens', () => {
    const overview = buildContextOverview(contextData())

    expect(overview.contributors.map(item => item.name)).toEqual([
      'Messages',
      'System prompt',
      'MCP tools',
      'Memory files',
      'Skills',
    ])
    expect(overview.reserveTokens).toBe(33_000)
    expect(overview.deferredTokens).toBe(18_000)
    expect(overview.availableTokens).toBe(27_000)
  })

  test('clamps the capacity bar to its requested width', () => {
    expect(stringWidth(buildCapacityBar(25, 20))).toBe(20)
    expect(stringWidth(buildCapacityBar(200, 8))).toBe(8)
    expect(stringWidth(buildCapacityBar(-10, 8))).toBe(8)
  })

  test('renders a decision-oriented view without horizontal overflow', async () => {
    for (const width of [40, 60, 80, 120]) {
      const output = await renderToString(
        <ContextVisualization data={contextData()} />,
        width,
      )
      const lines = output.split('\n')

      expect(output).toContain('Largest contributors')
      expect(output).toContain('Next actions')
      expect(output).toContain('Threshold')
      expect(output).not.toContain('Estimated usage by category')
      expect(Math.max(...lines.map(line => stringWidth(line)))).toBeLessThanOrEqual(
        width,
      )
    }
  })
})
