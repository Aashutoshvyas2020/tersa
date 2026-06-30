import { describe, expect, test } from 'bun:test'
import type { Command } from '../../commands.js'
import { filterHelpCommands } from './Commands.js'

function command(name: string, description: string): Command {
  return {
    type: 'local',
    name,
    description,
    supportsNonInteractive: false,
    load: async () => ({ call: async () => ({ type: 'skip' }) }),
  }
}

describe('help command filtering', () => {
  const commands = [
    command('status', 'Show runtime model and integrations'),
    command('permissions', 'Review tool access'),
    command('model', 'Change the active model'),
    command('status', 'Duplicate should not render'),
  ]

  test('deduplicates and sorts the default inventory', () => {
    expect(filterHelpCommands(commands, '').map(item => item.name)).toEqual([
      'model',
      'permissions',
      'status',
    ])
  })

  test('matches names and descriptions while ranking name prefixes first', () => {
    expect(filterHelpCommands(commands, 'model').map(item => item.name)).toEqual([
      'model',
      'status',
    ])
    expect(filterHelpCommands(commands, 'access').map(item => item.name)).toEqual([
      'permissions',
    ])
  })
})
