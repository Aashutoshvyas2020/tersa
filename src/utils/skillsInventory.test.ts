import { describe, expect, test } from 'bun:test'
import type { Command, PromptCommand } from '../commands.js'
import {
  getSkillSourceGroup,
  getVisibleSkillCommands,
  type SkillCommand,
} from './skillsInventory.js'

function promptCommand(
  name: string,
  overrides: Partial<Command & PromptCommand>,
): SkillCommand {
  return {
    type: 'prompt',
    name,
    description: `${name} description`,
    progressMessage: `Running ${name}`,
    contentLength: 1,
    source: 'userSettings',
    getPromptForCommand: async () => [],
    ...overrides,
  } as SkillCommand
}

describe('skills inventory', () => {
  test('uses the same public inventory as dollar invocation', () => {
    const commands: Command[] = [
      promptCommand('bundled-skill', {
        source: 'bundled',
        loadedFrom: 'bundled',
      }),
      promptCommand('managed-skill', {
        source: 'policySettings',
        loadedFrom: 'managed',
      }),
      promptCommand('hidden-skill', {
        source: 'bundled',
        loadedFrom: 'bundled',
        isHidden: true,
      }),
      {
        type: 'local',
        name: 'local-command',
        description: 'not a skill',
        supportsNonInteractive: false,
        load: async () => ({ call: async () => ({ type: 'skip' }) }),
      },
    ]

    expect(getVisibleSkillCommands(commands).map(command => command.name)).toEqual([
      'bundled-skill',
      'managed-skill',
    ])
  })

  test('classifies bundled and managed skills without dropping them', () => {
    expect(
      getSkillSourceGroup(
        promptCommand('bundled-skill', {
          source: 'bundled',
          loadedFrom: 'bundled',
        }),
      ),
    ).toBe('bundled')
    expect(
      getSkillSourceGroup(
        promptCommand('managed-skill', {
          source: 'policySettings',
          loadedFrom: 'managed',
        }),
      ),
    ).toBe('managed')
  })
})
