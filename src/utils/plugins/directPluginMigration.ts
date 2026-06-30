import { randomUUID } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { basename, join } from 'path'
import { getClaudeConfigHomeDir } from '../envUtils.js'
import { errorMessage } from '../errors.js'
import {
  clearInstalledPluginsCache,
  getInstalledPluginsFilePath,
  loadInstalledPluginsV2,
} from './installedPluginsManager.js'
import { getPluginsDirectory } from './pluginDirectories.js'
import {
  atomicWriteText,
  type DirectPluginRecord,
  getDirectPluginRegistryBackupPath,
  getDirectPluginRegistryPath,
  loadDirectPluginRegistry,
  saveDirectPluginRegistry,
} from './directPluginRegistry.js'
import {
  canonicalDirectPluginPath,
  readDirectPluginManifest,
} from './directPluginSource.js'

const LEGACY_ID = 'ck@cavekit-local'
const DIRECT_ID = 'ck'
const MARKETPLACE = 'cavekit-local'

interface Snapshot {
  path: string
  content: string | null
}

export interface CaveKitMigrationResult {
  directPlugin: DirectPluginRecord
  archivePath: string
  legacyPluginId: string
}

const snapshot = (path: string): Snapshot => ({
  path,
  content: existsSync(path) ? readFileSync(path, 'utf8') : null,
})

function restore(value: Snapshot): void {
  if (value.content === null) rmSync(value.path, { force: true })
  else atomicWriteText(value.path, value.content)
}

function deleteKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>
  let changed = false
  if (Object.hasOwn(object, key)) {
    delete object[key]
    changed = true
  }
  for (const container of ['enabledPlugins', 'marketplaces']) {
    const nested = object[container]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const map = nested as Record<string, unknown>
      if (Object.hasOwn(map, key)) {
        delete map[key]
        changed = true
      }
    }
  }
  return changed
}

function mutateJson(
  value: Snapshot,
  mutate: (data: Record<string, unknown>) => boolean,
): void {
  if (value.content === null) return
  const data = JSON.parse(value.content) as Record<string, unknown>
  if (mutate(data)) atomicWriteText(value.path, `${JSON.stringify(data, null, 2)}\n`)
}

function archiveSnapshots(
  values: Snapshot[],
  directPlugin: DirectPluginRecord,
): string {
  const stamp = directPlugin.updatedAt.replace(/[:.]/g, '-')
  const archivePath = join(
    getPluginsDirectory(),
    'archive',
    `cavekit-direct-migration-${stamp}-${randomUUID()}`,
  )
  mkdirSync(archivePath, { recursive: true })
  for (const value of values) {
    if (value.content !== null) {
      writeFileSync(join(archivePath, basename(value.path)), value.content, {
        encoding: 'utf8',
        mode: 0o600,
      })
    }
  }
  writeFileSync(
    join(archivePath, 'migration.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        migratedAt: directPlugin.updatedAt,
        legacyPluginId: LEGACY_ID,
        directPluginId: DIRECT_ID,
        installPath: directPlugin.installPath,
        version: directPlugin.version,
        revision: directPlugin.revision,
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
  return archivePath
}

export async function migrateCaveKitToDirect(
  verifyLoaded: (source: string) => Promise<void>,
): Promise<CaveKitMigrationResult> {
  const installedData = loadInstalledPluginsV2()
  const installation = installedData.plugins[LEGACY_ID]?.[0]
  if (!installation) throw new Error(`Legacy plugin ${LEGACY_ID} is not installed`)

  const installPath = canonicalDirectPluginPath(installation.installPath)
  const manifest = readDirectPluginManifest(installPath)
  if (installation.version && installation.version !== manifest.version) {
    throw new Error(
      `Legacy plugin version mismatch: installed metadata says ${installation.version}, manifest says ${manifest.version}`,
    )
  }
  const installedPath = getInstalledPluginsFilePath()
  const settingsPath = join(getClaudeConfigHomeDir(), 'settings.json')
  const marketplacesPath = join(getPluginsDirectory(), 'known_marketplaces.json')
  const values = [
    snapshot(getDirectPluginRegistryPath()),
    snapshot(getDirectPluginRegistryBackupPath()),
    snapshot(installedPath),
    snapshot(settingsPath),
    snapshot(marketplacesPath),
  ]
  let archivePath = ''

  try {
    const registry = loadDirectPluginRegistry()
    const prior = registry.plugins[DIRECT_ID]
    if (prior && prior.legacyPluginId !== LEGACY_ID) {
      throw new Error(
        `Direct plugin ${DIRECT_ID}@direct already exists and is not the legacy CaveKit installation`,
      )
    }
    const now = new Date().toISOString()
    const directPlugin: DirectPluginRecord = {
      id: DIRECT_ID,
      source: { type: 'path', value: installPath },
      installPath,
      version: installation.version || manifest.version,
      revision: installation.gitCommitSha,
      enabled: true,
      addedAt: prior?.addedAt ?? installation.installedAt ?? now,
      updatedAt: now,
      dataId: LEGACY_ID,
      legacyPluginId: LEGACY_ID,
      previousVersions: prior?.previousVersions,
    }
    registry.plugins[DIRECT_ID] = directPlugin
    saveDirectPluginRegistry(registry)

    await verifyLoaded(`${DIRECT_ID}@direct`)
    archivePath = archiveSnapshots(values.slice(2), directPlugin)

    const nextInstalled = structuredClone(installedData)
    delete nextInstalled.plugins[LEGACY_ID]
    atomicWriteText(installedPath, `${JSON.stringify(nextInstalled, null, 2)}\n`)
    mutateJson(values[3]!, data => deleteKey(data, LEGACY_ID))
    mutateJson(values[4]!, data => deleteKey(data, MARKETPLACE))
    clearInstalledPluginsCache()

    await verifyLoaded(`${DIRECT_ID}@direct`)
    return { directPlugin, archivePath, legacyPluginId: LEGACY_ID }
  } catch (error) {
    for (const value of [...values].reverse()) restore(value)
    clearInstalledPluginsCache()
    if (archivePath) rmSync(archivePath, { recursive: true, force: true })
    throw new Error(`CaveKit migration rolled back: ${errorMessage(error)}`)
  }
}
