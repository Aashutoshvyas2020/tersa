import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadDirectPluginRegistry, saveDirectPluginRegistry } from './directPluginRegistry.js'
import { loadPersistentDirectPlugins } from './pluginLoader.js'

let root = ''
let pluginRoot = ''
let previousCacheDir: string | undefined

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tersa-direct-loader-'))
  pluginRoot = join(root, 'plugin')
  mkdirSync(join(pluginRoot, '.claude-plugin'), { recursive: true })
  mkdirSync(join(pluginRoot, 'commands'), { recursive: true })
  mkdirSync(join(pluginRoot, 'skills', 'demo'), { recursive: true })
  writeFileSync(
    join(pluginRoot, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify(
      {
        name: 'demo-plugin',
        version: '1.2.3',
        commands: './commands',
        skills: './skills',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(pluginRoot, 'commands', 'hello.md'),
    '---\ndescription: Say hello\n---\n\nSay hello.\n',
  )
  writeFileSync(
    join(pluginRoot, 'skills', 'demo', 'SKILL.md'),
    '---\nname: demo\ndescription: Demo skill\n---\n\n# Demo\n',
  )
  previousCacheDir = process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = join(root, 'plugins')
})

afterEach(() => {
  if (previousCacheDir === undefined) delete process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  else process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = previousCacheDir
  rmSync(root, { recursive: true, force: true })
})

describe('persistent direct plugin loader', () => {
  test('loads a registry entry through the normal plugin construction path', async () => {
    const now = '2026-06-24T00:00:00.000Z'
    saveDirectPluginRegistry({
      version: 1,
      plugins: {
        'demo-plugin': {
          id: 'demo-plugin',
          source: { type: 'path', value: pluginRoot },
          installPath: pluginRoot,
          version: '1.2.3',
          enabled: true,
          addedAt: now,
          updatedAt: now,
        },
      },
    })

    const result = await loadPersistentDirectPlugins()
    expect(result.errors).toHaveLength(0)
    expect(result.plugins).toHaveLength(1)
    expect(result.plugins[0]?.source).toBe('demo-plugin@direct')
    expect(result.plugins[0]?.path).toBe(realpathSync(pluginRoot))
    expect(result.plugins[0]?.manifest.version).toBe('1.2.3')
    expect(result.plugins[0]?.commandsPaths?.[0]).toContain('commands')
    expect(loadDirectPluginRegistry().plugins['demo-plugin']).toBeDefined()
  })

  test('skips disabled registry entries', async () => {
    const now = '2026-06-24T00:00:00.000Z'
    saveDirectPluginRegistry({
      version: 1,
      plugins: {
        disabled: {
          id: 'disabled',
          source: { type: 'path', value: pluginRoot },
          installPath: pluginRoot,
          version: '1.2.3',
          enabled: false,
          addedAt: now,
          updatedAt: now,
        },
      },
    })

    const result = await loadPersistentDirectPlugins()
    expect(result.plugins).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })
})
