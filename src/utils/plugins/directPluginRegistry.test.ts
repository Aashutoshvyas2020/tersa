import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pluginDataDirPath } from './pluginDirectories.js'
import {
  type DirectPluginRecord,
  getDirectPluginRegistryBackupPath,
  getDirectPluginRegistryPath,
  listDirectPlugins,
  loadDirectPluginRegistry,
  normalizeDirectPluginId,
  saveDirectPluginRegistry,
} from './directPluginRegistry.js'
import {
  addDirectPlugin,
  reloadDirectPlugins,
  removeDirectPlugin,
} from './directPluginSource.js'

let root = ''
let pluginRoot = ''
let previousCacheDir: string | undefined

function writeManifest(version: string): void {
  const manifestDir = join(pluginRoot, '.claude-plugin')
  mkdirSync(manifestDir, { recursive: true })
  writeFileSync(
    join(manifestDir, 'plugin.json'),
    `${JSON.stringify({ name: 'demo-plugin', version }, null, 2)}\n`,
  )
  mkdirSync(join(pluginRoot, 'skills', 'demo'), { recursive: true })
  writeFileSync(
    join(pluginRoot, 'skills', 'demo', 'SKILL.md'),
    '---\nname: demo\ndescription: Demo skill\n---\n\n# Demo\n',
  )
}

function record(id: string, version: string): DirectPluginRecord {
  const now = '2026-06-24T00:00:00.000Z'
  return {
    id,
    source: { type: 'path', value: pluginRoot },
    installPath: pluginRoot,
    version,
    enabled: true,
    addedAt: now,
    updatedAt: now,
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tersa-direct-plugin-'))
  pluginRoot = join(root, 'source')
  mkdirSync(pluginRoot, { recursive: true })
  previousCacheDir = process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = join(root, 'plugins')
  writeManifest('1.0.0')
})

afterEach(() => {
  if (previousCacheDir === undefined) {
    delete process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  } else {
    process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR = previousCacheDir
  }
  rmSync(root, { recursive: true, force: true })
})

describe('direct plugin registry', () => {
  test('adds, versions, reloads, and removes a local plugin without deleting source', async () => {
    const added = await addDirectPlugin(pluginRoot)
    expect(added.id).toBe('demo-plugin')
    expect(added.version).toBe('1.0.0')
    expect(listDirectPlugins()).toHaveLength(1)

    writeManifest('1.1.0')
    const [reloaded] = await reloadDirectPlugins('demo-plugin')
    expect(reloaded?.version).toBe('1.1.0')
    expect(reloaded?.previousVersions?.[0]?.version).toBe('1.0.0')

    const removed = removeDirectPlugin('demo-plugin')
    expect(removed.version).toBe('1.1.0')
    expect(listDirectPlugins()).toHaveLength(0)
    expect(existsSync(pluginRoot)).toBe(true)
  })

  test('rejects plain HTTP git sources before making a network request', async () => {
    await expect(
      addDirectPlugin('http://example.invalid/demo-plugin.git'),
    ).rejects.toThrow('Plain HTTP git sources are not allowed')
  })

  test('clones a local git source into a commit-pinned managed version', async () => {
    const gitRoot = join(root, 'demo-source.git')
    mkdirSync(join(gitRoot, '.claude-plugin'), { recursive: true })
    writeFileSync(
      join(gitRoot, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({ name: 'git-demo', version: '2.0.0' })}\n`,
    )
    execFileSync('git', ['init'], { cwd: gitRoot, stdio: 'ignore' })
    execFileSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: gitRoot,
    })
    execFileSync('git', ['config', 'user.name', 'Tersa Test'], { cwd: gitRoot })
    execFileSync('git', ['add', '.'], { cwd: gitRoot })
    execFileSync('git', ['commit', '-m', 'initial'], {
      cwd: gitRoot,
      stdio: 'ignore',
    })

    const added = await addDirectPlugin(gitRoot)
    expect(added.id).toBe('git-demo')
    expect(added.source).toEqual({ type: 'git', value: gitRoot })
    expect(added.revision).toMatch(/^[a-f0-9]{40}$/)
    expect(added.installPath).toContain(join('direct', 'git-demo', 'versions'))
    expect(existsSync(added.installPath)).toBe(true)
  })

  test('bounds direct plugin version history', async () => {
    await addDirectPlugin(pluginRoot)
    for (let index = 1; index <= 24; index += 1) {
      writeManifest(`1.${index}.0`)
      await reloadDirectPlugins('demo-plugin')
    }

    const current = loadDirectPluginRegistry().plugins['demo-plugin']
    expect(current?.previousVersions).toHaveLength(20)
    expect(current?.previousVersions?.[0]?.version).toBe('1.4.0')
    expect(current?.previousVersions?.at(-1)?.version).toBe('1.23.0')
  })

  test('falls back to the previous registry snapshot when the primary is corrupt', () => {
    saveDirectPluginRegistry({
      version: 1,
      plugins: { demo: record('demo', '1.0.0') },
    })
    saveDirectPluginRegistry({
      version: 1,
      plugins: { demo: record('demo', '2.0.0') },
    })

    expect(existsSync(getDirectPluginRegistryBackupPath())).toBe(true)
    writeFileSync(getDirectPluginRegistryPath(), '{not-json')

    const recovered = loadDirectPluginRegistry()
    expect(recovered.plugins.demo?.version).toBe('1.0.0')
  })

  test('rejects prototype-polluting direct plugin ids', () => {
    expect(() => normalizeDirectPluginId('__proto__')).toThrow(
      'reserved direct plugin id',
    )
    expect(() => normalizeDirectPluginId('constructor')).toThrow(
      'reserved direct plugin id',
    )
    expect(() => normalizeDirectPluginId('prototype')).toThrow(
      'reserved direct plugin id',
    )
  })

  test('rejects malformed registry records and preserves a valid backup', () => {
    saveDirectPluginRegistry({
      version: 1,
      plugins: { demo: record('demo', '1.0.0') },
    })
    saveDirectPluginRegistry({
      version: 1,
      plugins: { demo: record('demo', '2.0.0') },
    })
    writeFileSync(
      getDirectPluginRegistryPath(),
      JSON.stringify({
        version: 1,
        plugins: { demo: { id: 'demo', enabled: true } },
      }),
    )

    const recovered = loadDirectPluginRegistry()
    expect(recovered.plugins.demo?.version).toBe('1.0.0')
    expect(Object.getPrototypeOf(recovered.plugins)).toBeNull()
  })

  test('maps a direct plugin to its legacy persistent data identity', () => {
    const legacy = record('demo', '1.0.0')
    legacy.dataId = 'demo@legacy-market'
    saveDirectPluginRegistry({ version: 1, plugins: { demo: legacy } })

    expect(pluginDataDirPath('demo@direct')).toEndWith(
      join('data', 'demo-legacy-market'),
    )
    expect(readFileSync(getDirectPluginRegistryPath(), 'utf8')).toContain(
      'demo@legacy-market',
    )
  })
})
