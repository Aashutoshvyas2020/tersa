import { randomUUID } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import { getPluginsDirectory } from './pluginDirectories.js'

export const DIRECT_PLUGIN_SCHEMA_VERSION = 1 as const
const MAX_DIRECT_PLUGIN_ID_LENGTH = 64
const RESERVED_DIRECT_PLUGIN_IDS = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

export type DirectPluginSource =
  | { type: 'path'; value: string }
  | { type: 'git'; value: string }

export interface DirectPluginVersion {
  installPath: string
  version: string
  revision?: string
  activatedAt: string
}

export interface DirectPluginRecord {
  id: string
  source: DirectPluginSource
  installPath: string
  version: string
  revision?: string
  enabled: boolean
  addedAt: string
  updatedAt: string
  dataId?: string
  dataPath?: string
  legacyPluginId?: string
  previousVersions?: DirectPluginVersion[]
}

export interface DirectPluginRegistry {
  version: typeof DIRECT_PLUGIN_SCHEMA_VERSION
  plugins: Record<string, DirectPluginRecord>
}

type UnknownRecord = Record<string, unknown>

function pluginMap(): Record<string, DirectPluginRecord> {
  return Object.create(null) as Record<string, DirectPluginRecord>
}

const emptyRegistry = (): DirectPluginRegistry => ({
  version: DIRECT_PLUGIN_SCHEMA_VERSION,
  plugins: pluginMap(),
})

export const getDirectPluginRegistryPath = (): string =>
  join(getPluginsDirectory(), 'direct_plugins.json')

export const getDirectPluginRegistryBackupPath = (): string =>
  join(getPluginsDirectory(), 'direct_plugins.json.bak')

export function atomicWriteText(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(temp, content, { encoding: 'utf8', mode: 0o600 })
  try {
    renameSync(temp, file)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isDirectPluginSource(value: unknown): value is DirectPluginSource {
  if (!isObject(value) || !isNonEmptyString(value.value)) return false
  if (value.type === 'path') return isAbsolute(value.value)
  return value.type === 'git'
}

function isDirectPluginVersion(value: unknown): value is DirectPluginVersion {
  return (
    isObject(value) &&
    isNonEmptyString(value.installPath) &&
    isAbsolute(value.installPath) &&
    isNonEmptyString(value.version) &&
    isOptionalString(value.revision) &&
    isTimestamp(value.activatedAt)
  )
}

export function isManagedDirectPluginInstallPath(installPath: string): boolean {
  const managedRoot = join(getPluginsDirectory(), 'direct')
  const path = relative(resolve(managedRoot), resolve(installPath))
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`)
}

function isDirectPluginRecord(
  value: unknown,
  registryKey: string,
): value is DirectPluginRecord {
  if (!isObject(value) || value.id !== registryKey) return false
  try {
    if (normalizeDirectPluginId(registryKey) !== registryKey) return false
  } catch {
    return false
  }

  if (
    !isDirectPluginSource(value.source) ||
    !isNonEmptyString(value.installPath) ||
    !isAbsolute(value.installPath)
  ) {
    return false
  }
  if (
    (value.source.type === 'path' && value.source.value !== value.installPath) ||
    (value.source.type === 'git' &&
      !isManagedDirectPluginInstallPath(value.installPath))
  ) {
    return false
  }

  return (
    isNonEmptyString(value.version) &&
    isOptionalString(value.revision) &&
    typeof value.enabled === 'boolean' &&
    isTimestamp(value.addedAt) &&
    isTimestamp(value.updatedAt) &&
    isOptionalString(value.dataId) &&
    isOptionalString(value.dataPath) &&
    isOptionalString(value.legacyPluginId) &&
    (value.previousVersions === undefined ||
      (Array.isArray(value.previousVersions) &&
        value.previousVersions.every(isDirectPluginVersion)))
  )
}

function parseRegistryValue(value: unknown): DirectPluginRegistry | null {
  if (
    !isObject(value) ||
    value.version !== DIRECT_PLUGIN_SCHEMA_VERSION ||
    !isObject(value.plugins)
  ) {
    return null
  }

  const plugins = pluginMap()
  for (const [id, record] of Object.entries(value.plugins)) {
    if (!isDirectPluginRecord(record, id)) return null
    plugins[id] = record
  }
  return { version: DIRECT_PLUGIN_SCHEMA_VERSION, plugins }
}

function parseRegistryText(content: string): DirectPluginRegistry | null {
  try {
    return parseRegistryValue(JSON.parse(content))
  } catch {
    return null
  }
}

export function loadDirectPluginRegistry(): DirectPluginRegistry {
  for (const file of [
    getDirectPluginRegistryPath(),
    getDirectPluginRegistryBackupPath(),
  ]) {
    if (!existsSync(file)) continue
    const registry = parseRegistryText(readFileSync(file, 'utf8'))
    if (registry) return registry
  }
  return emptyRegistry()
}

export function saveDirectPluginRegistry(registry: DirectPluginRegistry): void {
  const validated = parseRegistryValue(registry)
  if (!validated) throw new Error('Refusing to write an invalid direct plugin registry')

  const file = getDirectPluginRegistryPath()
  const backup = getDirectPluginRegistryBackupPath()
  mkdirSync(getPluginsDirectory(), { recursive: true })

  if (existsSync(file)) {
    const currentText = readFileSync(file, 'utf8')
    if (parseRegistryText(currentText)) atomicWriteText(backup, currentText)
  }
  atomicWriteText(file, `${JSON.stringify(validated, null, 2)}\n`)
}

export function listDirectPlugins(): DirectPluginRecord[] {
  return Object.values(loadDirectPluginRegistry().plugins).sort((a, b) =>
    a.id.localeCompare(b.id),
  )
}

export function normalizeDirectPluginId(value: string): string {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!id) throw new Error('Direct plugin id cannot be empty')
  if (id.length > MAX_DIRECT_PLUGIN_ID_LENGTH) {
    throw new Error(
      `Direct plugin id cannot exceed ${MAX_DIRECT_PLUGIN_ID_LENGTH} characters`,
    )
  }
  if (RESERVED_DIRECT_PLUGIN_IDS.has(id)) {
    throw new Error(`"${id}" is a reserved direct plugin id`)
  }
  return id
}
