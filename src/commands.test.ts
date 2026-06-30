import { describe, expect, test } from 'bun:test'
import {
  builtInCommandNames,
  formatDescriptionWithSource,
} from './commands.js'
import fastCommand from './commands/fast/index.js'
import { isCommand } from './types/command.js'

describe('builtInCommandNames', () => {
  test('keeps /fast discoverable even when the active provider cannot use it', () => {
    expect('availability' in fastCommand).toBe(false)
    expect('isEnabled' in fastCommand).toBe(false)
    expect('isHidden' in fastCommand).toBe(false)
  })

  test('includes the request-size diagnostic command', () => {
    expect(builtInCommandNames()).toContain('request-size')
  })

  test('includes the /dream command', () => {
    expect(builtInCommandNames()).toContain('dream')
  })
})

describe('isCommand', () => {
  test('rejects generated missing-module noop stubs', () => {
    function noop19() {
      return null
    }

    expect(isCommand(noop19)).toBe(false)
    expect(isCommand({ isHidden: true, name: 'stub' })).toBe(false)
  })

  test('accepts real command objects', () => {
    expect(
      isCommand({
        type: 'local',
        name: 'example',
        description: 'example command',
        supportsNonInteractive: false,
        load: async () => ({
          call: async () => ({ type: 'skip' }),
        }),
      }),
    ).toBe(true)
  })
})

describe('formatDescriptionWithSource', () => {
  test('returns empty text for prompt commands missing a description', () => {
    const command = {
      name: 'example',
      type: 'prompt',
      source: 'builtin',
      description: undefined,
    } as any

    expect(formatDescriptionWithSource(command)).toBe('')
  })

  test('formats plugin commands with missing description safely', () => {
    const command = {
      name: 'example',
      type: 'prompt',
      source: 'plugin',
      description: undefined,
      pluginInfo: {
        pluginManifest: {
          name: 'MyPlugin',
        },
      },
    } as any

    expect(formatDescriptionWithSource(command)).toBe('(MyPlugin) ')
  })
})
