import { describe, expect, test } from 'bun:test'
import type { Command } from '../../commands.js'
import {
  findDollarInvocations,
  generateDollarInvocationSuggestions,
  getDollarInvocationAliases,
} from './dollarInvocationSuggestions.js'

function prompt(name: string, extra: Partial<Command> = {}): Command {
  return {
    type: 'prompt',
    name,
    description: `${name} description`,
    progressMessage: name,
    contentLength: 1,
    source: 'bundled',
    async getPromptForCommand() {
      return [{ type: 'text', text: name }]
    },
    ...extra,
  } as Command
}

describe('dollar invocation suggestions', () => {
  test('shows only skill/plugin/MCP prompt commands', () => {
    const local = { type: 'local', name: 'help', description: 'help', call: async () => ({ type: 'skip' }) } as unknown as Command
    const items = generateDollarInvocationSuggestions('$', 1, [
      prompt('review', { loadedFrom: 'skills' }),
      prompt('plug', { source: 'plugin' }),
      prompt('remote', { source: 'mcp', isMcp: true }),
      local,
    ])
    expect(items.map(item => item.displayText)).toEqual(['$review', '$plug', '$remote'])
  })

  test('qualifies duplicate names deterministically', () => {
    const skill = prompt('review', { loadedFrom: 'skills' })
    const plugin = prompt('review', { source: 'plugin' })
    const mcp = prompt('review', { source: 'mcp', isMcp: true })
    const commands = [skill, plugin, mcp]

    expect(getDollarInvocationAliases(skill, commands)).toEqual(['skill:review'])
    expect(getDollarInvocationAliases(plugin, commands)).toEqual(['plugin:review'])
    expect(getDollarInvocationAliases(mcp, commands)).toEqual(['mcp:review'])
    expect(generateDollarInvocationSuggestions('$', 1, commands).map(item => item.displayText)).toEqual([
      '$skill:review',
      '$plugin:review',
      '$mcp:review',
    ])
  })

  test('ignores escaped dollars, money, env vars, and code', () => {
    const commands = [prompt('review', { loadedFrom: 'skills' })]
    const text = [
      '\\$review costs $5 and ${VAR} and `$review`',
      '```',
      '$review',
      '```',
      '$review',
    ].join('\n')
    expect(findDollarInvocations(text, commands).map(item => item.id)).toEqual(['skill:review'])
  })

  test('dedupes repeated identical invocations and preserves distinct order', () => {
    const a = prompt('a', { loadedFrom: 'skills' })
    const b = prompt('b', { source: 'plugin' })
    expect(findDollarInvocations('$a then $b then $a', [a, b]).map(item => item.id)).toEqual([
      'skill:a',
      'plugin:b',
    ])
  })
})
