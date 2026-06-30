import { execFileSync } from 'child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
} from 'fs'
import { randomUUID } from 'crypto'
import { basename, dirname, join, relative, resolve, sep } from 'path'
import { errorMessage } from '../errors.js'
import { gitExe } from '../git.js'
import {
  redactUrlForDisplay,
  shouldRedactUrlQueryParam,
} from '../urlRedaction.js'
import { getPluginsDirectory } from './pluginDirectories.js'
import { buildGitChildEnv } from './gitEnv.js'
import { gitClone } from './marketplaceManager.js'
import {
  type DirectPluginRecord,
  type DirectPluginRegistry,
  type DirectPluginVersion,
  loadDirectPluginRegistry,
  normalizeDirectPluginId,
  saveDirectPluginRegistry,
} from './directPluginRegistry.js'

const MAX_PREVIOUS_DIRECT_PLUGIN_VERSIONS = 20
const GIT_METADATA_TIMEOUT_MS = 15_000

interface PreparedDirectPlugin {
  id: string
  source: DirectPluginRecord['source']
  installPath: string
  version: string
  revision?: string
  stagingPath?: string
  createdInstallPath?: string
}

export function readDirectPluginManifest(root: string): {
  name: string
  version: string
} {
  const path = [
    join(root, '.claude-plugin', 'plugin.json'),
    join(root, 'plugin.json'),
  ].find(existsSync)
  if (!path) {
    throw new Error(
      `No plugin manifest found in ${root}; expected .claude-plugin/plugin.json or plugin.json`,
    )
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
    name?: unknown
    version?: unknown
  }
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    throw new Error(`Plugin manifest at ${path} is missing a valid name`)
  }
  return {
    name: manifest.name.trim(),
    version:
      typeof manifest.version === 'string' && manifest.version.trim()
        ? manifest.version.trim()
        : 'unknown',
  }
}

export function canonicalDirectPluginPath(source: string): string {
  const path = resolve(source)
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`Plugin path is not a directory: ${path}`)
  }
  return realpathSync(path)
}

const isGitUrl = (source: string): boolean =>
  /^(?:https?:\/\/|ssh:\/\/|git@|github:)/i.test(source) ||
  /\.git(?:#.*)?$/i.test(source)

const safeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') ||
  'unknown'

function splitRef(source: string): { source: string; ref?: string } {
  const index = source.lastIndexOf('#')
  if (index < 0) return { source }
  const ref = source.slice(index + 1)
  return { source: source.slice(0, index), ref: ref || undefined }
}

function validateGitRef(ref: string | undefined): string | undefined {
  if (ref === undefined) return undefined
  if (
    ref.length > 255 ||
    ref.startsWith('-') ||
    ref.endsWith('.') ||
    ref.includes('..') ||
    ref.includes('@{') ||
    /[\x00-\x20~^:?*\[\\]/.test(ref)
  ) {
    throw new Error(`Invalid git ref: ${JSON.stringify(ref)}`)
  }
  return ref
}

function parseGitSource(source: string): { cloneUrl: string; ref?: string } {
  const trimmed = source.trim()
  if (!trimmed) throw new Error('Git plugin source cannot be empty')

  if (/^github:/i.test(trimmed)) {
    const { source: shorthand, ref } = splitRef(trimmed.slice('github:'.length))
    if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+(?:\.git)?$/i.test(shorthand)) {
      throw new Error(
        'GitHub direct plugin sources must use github:owner/repository[#ref]',
      )
    }
    return {
      cloneUrl: `https://github.com/${shorthand.replace(/\.git$/i, '')}.git`,
      ref: validateGitRef(ref),
    }
  }

  if (/^https?:\/\//i.test(trimmed) || /^ssh:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:') {
      throw new Error('Plain HTTP git sources are not allowed; use HTTPS or SSH')
    }
    if (
      parsed.protocol === 'https:' &&
      (parsed.username ||
        parsed.password ||
        [...parsed.searchParams.keys()].some(shouldRedactUrlQueryParam))
    ) {
      throw new Error(
        'Credentials must not be embedded in direct plugin URLs; use a Git credential helper',
      )
    }
    const ref = parsed.hash ? decodeURIComponent(parsed.hash.slice(1)) : undefined
    parsed.hash = ''
    return { cloneUrl: parsed.toString(), ref: validateGitRef(ref) }
  }

  if (/^git@/i.test(trimmed)) {
    const { source: cloneUrl, ref } = splitRef(trimmed)
    if (!/^git@[^:]+:.+/.test(cloneUrl)) throw new Error('Invalid SSH git source')
    return { cloneUrl, ref: validateGitRef(ref) }
  }

  const { source: localSource, ref } = splitRef(trimmed)
  if (!/\.git$/i.test(localSource)) {
    throw new Error(`Unsupported git plugin source: ${redactUrlForDisplay(trimmed)}`)
  }
  return {
    cloneUrl: canonicalDirectPluginPath(localSource),
    ref: validateGitRef(ref),
  }
}

function readGitRevision(path: string): string {
  return execFileSync(
    gitExe(),
    ['-c', 'core.hooksPath=/dev/null', '-C', path, 'rev-parse', 'HEAD'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: buildGitChildEnv(),
      timeout: GIT_METADATA_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    },
  ).trim()
}

function isInside(parent: string, child: string): boolean {
  const path = relative(resolve(parent), resolve(child))
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`)
}

function validateExistingGitInstall(prepared: PreparedDirectPlugin): void {
  const managedRoot = join(getPluginsDirectory(), 'direct')
  if (!isInside(managedRoot, prepared.installPath)) {
    throw new Error('Direct plugin install path escaped its managed directory')
  }
  if (lstatSync(prepared.installPath).isSymbolicLink()) {
    throw new Error(`Refusing to reuse symlinked direct plugin install: ${prepared.installPath}`)
  }
  const realManagedRoot = realpathSync(managedRoot)
  const realInstallPath = realpathSync(prepared.installPath)
  if (!isInside(realManagedRoot, realInstallPath)) {
    throw new Error('Direct plugin install resolved outside its managed directory')
  }
  const manifest = readDirectPluginManifest(realInstallPath)
  if (
    normalizeDirectPluginId(manifest.name) !== prepared.id ||
    manifest.version !== prepared.version ||
    readGitRevision(realInstallPath) !== prepared.revision
  ) {
    throw new Error(
      `Existing direct plugin version failed integrity validation: ${prepared.installPath}`,
    )
  }
}

async function prepareGit(
  source: string,
  requestedId?: string,
): Promise<PreparedDirectPlugin> {
  const parsed = parseGitSource(source)
  const directRoot = join(getPluginsDirectory(), 'direct')
  const staging = join(directRoot, '.staging', randomUUID())
  mkdirSync(dirname(staging), { recursive: true })
  try {
    const result = await gitClone(
      parsed.cloneUrl,
      staging,
      parsed.ref,
      undefined,
      false,
    )
    if (result.code !== 0) {
      throw new Error(result.stderr || `git clone exited with code ${result.code}`)
    }
    const manifest = readDirectPluginManifest(staging)
    const id = normalizeDirectPluginId(requestedId || manifest.name)
    const revision = readGitRevision(staging)
    const installPath = join(
      directRoot,
      id,
      'versions',
      `${safeSegment(manifest.version)}-${revision.slice(0, 12)}`,
    )
    return {
      id,
      source: { type: 'git', value: source },
      installPath,
      version: manifest.version,
      revision,
      stagingPath: staging,
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw new Error(
      `Failed to prepare git plugin ${redactUrlForDisplay(source)}: ${errorMessage(error)}`,
    )
  }
}

async function prepareDirectPluginSource(
  source: string,
  requestedId?: string,
): Promise<PreparedDirectPlugin> {
  if (isGitUrl(source)) return prepareGit(source, requestedId)
  const installPath = canonicalDirectPluginPath(source)
  const manifest = readDirectPluginManifest(installPath)
  return {
    id: normalizeDirectPluginId(requestedId || manifest.name || basename(installPath)),
    source: { type: 'path', value: installPath },
    installPath,
    version: manifest.version,
  }
}

function discardPrepared(prepared: PreparedDirectPlugin): void {
  if (prepared.stagingPath) {
    rmSync(prepared.stagingPath, { recursive: true, force: true })
  }
}

function finalizePrepared(prepared: PreparedDirectPlugin): PreparedDirectPlugin {
  if (!prepared.stagingPath) return prepared
  mkdirSync(dirname(prepared.installPath), { recursive: true })
  if (existsSync(prepared.installPath)) {
    validateExistingGitInstall(prepared)
    rmSync(prepared.stagingPath, { recursive: true, force: true })
    return { ...prepared, stagingPath: undefined }
  }
  renameSync(prepared.stagingPath, prepared.installPath)
  return {
    ...prepared,
    stagingPath: undefined,
    createdInstallPath: prepared.installPath,
  }
}

function previousVersions(record: DirectPluginRecord): DirectPluginVersion[] {
  const history = [...(record.previousVersions ?? [])]
  if (
    !history.some(
      item =>
        item.installPath === record.installPath &&
        item.version === record.version &&
        item.revision === record.revision,
    )
  ) {
    history.push({
      installPath: record.installPath,
      version: record.version,
      revision: record.revision,
      activatedAt: record.updatedAt,
    })
  }
  return history.slice(-MAX_PREVIOUS_DIRECT_PLUGIN_VERSIONS)
}

function registryReferencesPath(
  registry: DirectPluginRegistry,
  installPath: string,
): boolean {
  return Object.values(registry.plugins).some(
    record =>
      record.installPath === installPath ||
      record.previousVersions?.some(item => item.installPath === installPath),
  )
}

export function cleanupUnreferencedDirectPluginInstall(
  installPath: string,
  registry: DirectPluginRegistry = loadDirectPluginRegistry(),
): boolean {
  if (registryReferencesPath(registry, installPath)) return false
  const managedRoot = join(getPluginsDirectory(), 'direct')
  if (!isInside(managedRoot, installPath) || !existsSync(installPath)) return false
  rmSync(installPath, { recursive: true, force: true })
  return true
}

export async function addDirectPlugin(
  source: string,
  options: {
    id?: string
    force?: boolean
    dataId?: string
    legacyPluginId?: string
  } = {},
): Promise<DirectPluginRecord> {
  const registry = loadDirectPluginRegistry()
  if (options.id) {
    const requestedId = normalizeDirectPluginId(options.id)
    if (registry.plugins[requestedId] && !options.force) {
      throw new Error(
        `Direct plugin "${requestedId}" already exists; use --force to replace it`,
      )
    }
  }

  const prepared = await prepareDirectPluginSource(source, options.id)
  const existing = registry.plugins[prepared.id]
  if (existing && !options.force) {
    discardPrepared(prepared)
    throw new Error(
      `Direct plugin "${prepared.id}" already exists; use --force to replace it`,
    )
  }

  let finalized: PreparedDirectPlugin | undefined
  try {
    finalized = finalizePrepared(prepared)
    const {
      stagingPath: _stagingPath,
      createdInstallPath: _createdInstallPath,
      ...plugin
    } = finalized
    const now = new Date().toISOString()
    const record: DirectPluginRecord = {
      ...plugin,
      enabled: true,
      addedAt: existing?.addedAt ?? now,
      updatedAt: now,
      dataId: options.dataId ?? existing?.dataId,
      legacyPluginId: options.legacyPluginId ?? existing?.legacyPluginId,
      previousVersions: existing ? previousVersions(existing) : undefined,
    }
    registry.plugins[record.id] = record
    saveDirectPluginRegistry(registry)
    return record
  } catch (error) {
    discardPrepared(prepared)
    if (finalized?.createdInstallPath) {
      cleanupUnreferencedDirectPluginInstall(
        finalized.createdInstallPath,
        registry,
      )
    }
    throw error
  }
}

export function removeDirectPlugin(id: string): DirectPluginRecord {
  const normalized = normalizeDirectPluginId(id)
  const registry = loadDirectPluginRegistry()
  const record = registry.plugins[normalized]
  if (!record) throw new Error(`Direct plugin "${normalized}" is not registered`)
  delete registry.plugins[normalized]
  saveDirectPluginRegistry(registry)
  return record
}

export async function reloadDirectPlugins(
  id?: string,
): Promise<DirectPluginRecord[]> {
  const registry = loadDirectPluginRegistry()
  const ids = id
    ? [normalizeDirectPluginId(id)]
    : Object.keys(registry.plugins).sort()
  const result: DirectPluginRecord[] = []
  const preparedPlugins: PreparedDirectPlugin[] = []
  const createdInstallPaths: string[] = []

  try {
    for (const pluginId of ids) {
      const current = registry.plugins[pluginId]
      if (!current) {
        throw new Error(`Direct plugin "${pluginId}" is not registered`)
      }
      const prepared = await prepareDirectPluginSource(
        current.source.value,
        current.id,
      )
      preparedPlugins.push(prepared)
      const finalized = finalizePrepared(prepared)
      if (finalized.createdInstallPath) {
        createdInstallPaths.push(finalized.createdInstallPath)
      }
      const {
        stagingPath: _stagingPath,
        createdInstallPath: _createdInstallPath,
        ...plugin
      } = finalized
      const changed =
        plugin.installPath !== current.installPath ||
        plugin.version !== current.version ||
        plugin.revision !== current.revision
      const next: DirectPluginRecord = {
        ...current,
        ...plugin,
        updatedAt: new Date().toISOString(),
        previousVersions: changed
          ? previousVersions(current)
          : current.previousVersions,
      }
      registry.plugins[pluginId] = next
      result.push(next)
    }
    saveDirectPluginRegistry(registry)
    return result
  } catch (error) {
    for (const prepared of preparedPlugins) discardPrepared(prepared)
    const persistedRegistry = loadDirectPluginRegistry()
    for (const installPath of createdInstallPaths) {
      cleanupUnreferencedDirectPluginInstall(installPath, persistedRegistry)
    }
    throw error
  }
}
