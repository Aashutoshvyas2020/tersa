import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { migrateCaveKitToDirect } from './directPluginMigration.js'
import { loadDirectPluginRegistry } from './directPluginRegistry.js'
import {
  clearInstalledPluginsCache,
  getInstalledPluginsFilePath,
} from './installedPluginsManager.js'

let root = ''
let cacheDir = ''
let configDir = ''
let installPath = ''
let previousCacheDir: string | undefined
let previousConfigDir: string | undefined

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function seedLegacyState(): {
  installedPath: string
  settingsPath: string
  marketplacesPath: string
} {
  const manifestDir = join(installPath, '.claude-plugin')
  mkdirSync(manifestDir, { recursive: true })
  writeJson(join(manifestDir, 'plugin.json'), {
    name: 'ck',
    version: '3.0.0',
  })

  const installedPath = getInstalledPluginsFilePath()
  const settingsPath = join(configDir, 'settings.json')
  const marketplacesPath = join(cacheDir, 'known_marketplaces.json')
  writeJson(installedPath, {
    version: 2,
    plugins: {
      'ck@cavekit-local': [
        {
          scope: 'user',
          installPath,
          version: '3.0.0',
          installedAt: '2026-04-21T04:06:43.366Z',
          lastUpdated: '2026-04-21T04:06:43.366Z',
          gitCommitSha: '9aa1905f7d00dea479751f703e775bb1513f8532',
        },
      ],
    },
  })
  writeJson(settingsPath, {
    enabledPlugins: {
      'ck@cavekit-local': true,
      'keep@market': true,
    },
  })
  writeJson(marketplacesPath, {
    'cavekit-local': { source: installPath },
    keep: { source: '/keep' },
  })
  clearInstalledPluginsCache()
  return { installedPath, settingsPath, marketplacesPath }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tersa-cavekit-migration-'))
  cacheDir = join(root, 'plugins')
  configDir = join(root, 'config')
  installPath = join(root, 'legacy-cavekit')
  mkdirSync(installPath, { recursive: true })
  previousCacheDir = process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = cacheDir
  process.env.CLAUDE_CONFIG_DIR = configDir
})

afterEach(() => {
  clearInstalledPluginsCache()
  if (previousCacheDir === undefined) delete process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  else process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = previousCacheDir
  if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
  rmSync(root, { recursive: true, force: true })
})

describe('CaveKit direct migration', () => {
  test('preserves version, path, revision, and data identity while archiving legacy state', async () => {
    const { installedPath, settingsPath, marketplacesPath } = seedLegacyState()
    const verified: string[] = []

    const result = await migrateCaveKitToDirect(async source => {
      verified.push(source)
    })

    expect(verified).toEqual(['ck@direct', 'ck@direct'])
    expect(result.directPlugin.installPath).toBe(realpathSync(installPath))
    expect(result.directPlugin.version).toBe('3.0.0')
    expect(result.directPlugin.revision).toBe(
      '9aa1905f7d00dea479751f703e775bb1513f8532',
    )
    expect(result.directPlugin.dataId).toBe('ck@cavekit-local')
    expect(existsSync(result.archivePath)).toBe(true)

    const installed = JSON.parse(readFileSync(installedPath, 'utf8'))
    expect(installed.plugins['ck@cavekit-local']).toBeUndefined()
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(settings.enabledPlugins['ck@cavekit-local']).toBeUndefined()
    expect(settings.enabledPlugins['keep@market']).toBe(true)
    const marketplaces = JSON.parse(readFileSync(marketplacesPath, 'utf8'))
    expect(marketplaces['cavekit-local']).toBeUndefined()
    expect(marketplaces.keep).toBeDefined()
    expect(loadDirectPluginRegistry().plugins.ck?.legacyPluginId).toBe(
      'ck@cavekit-local',
    )
  })

  test('restores every modified file when post-migration verification fails', async () => {
    const paths = seedLegacyState()
    const before = Object.fromEntries(
      Object.entries(paths).map(([key, path]) => [key, readFileSync(path, 'utf8')]),
    )
    let checks = 0

    await expect(
      migrateCaveKitToDirect(async () => {
        checks += 1
        if (checks === 2) throw new Error('verification failed')
      }),
    ).rejects.toThrow('rolled back')

    expect(checks).toBe(2)
    expect(readFileSync(paths.installedPath, 'utf8')).toBe(before.installedPath)
    expect(readFileSync(paths.settingsPath, 'utf8')).toBe(before.settingsPath)
    expect(readFileSync(paths.marketplacesPath, 'utf8')).toBe(
      before.marketplacesPath,
    )
    expect(loadDirectPluginRegistry().plugins.ck).toBeUndefined()
    const archiveRoot = join(cacheDir, 'archive')
    expect(existsSync(archiveRoot) ? readdirSync(archiveRoot) : []).toHaveLength(0)
  })
})
