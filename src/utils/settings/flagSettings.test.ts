import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getFlagSettingsPath,
  setAllowedSettingSources,
  setFlagSettingsInline,
  setFlagSettingsPath,
} from '../../bootstrap/state.js'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../../test/sharedMutationLock.js'
import { SETTING_SOURCES } from './constants.js'
import { eagerLoadSettingsFromArgs } from './flagSettings.js'
import { resetSettingsCache } from './settingsCache.js'

type SettingsModule = typeof import('./settings.js')

let tempDir: string

beforeEach(async () => {
  await acquireSharedMutationLock('utils/settings/flagSettings.test.ts')
  mock.restore()
  // realpathSync so the temp path matches what the settings loader stores:
  // on macOS tmpdir() lives under /tmp, a symlink to /private/tmp, and the
  // loader canonicalises the --settings path, which would otherwise mismatch.
  tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'tersa-flag-settings-')))
  resetSettingsBootstrapState()
  setAllowedSettingSources(['flagSettings'])
})

afterEach(() => {
  resetSettingsBootstrapState()
  setAllowedSettingSources([...SETTING_SOURCES])
  rmSync(tempDir, { recursive: true, force: true })
  releaseSharedMutationLock()
})

test('loads --settings before resolving out-of-process teammate model routes', async () => {
  const routedModel = 'deepseek-worker-test-route'
  const settingsPath = writeSettingsFile({
    agentModels: {
      [routedModel]: {
        base_url: 'https://api.deepseek.example/v1',
        api_key: 'sk-deepseek-worker',
      },
    },
  })
  const args = [
    '--agent-name',
    'worker-a',
    '--team-name',
    'review-team',
    '--model',
    routedModel,
    '--settings',
    settingsPath,
  ]

  const loadResult = eagerLoadSettingsFromArgs(args)
  const importStamp = `${Date.now()}-${Math.random()}`
  const { getInitialSettings } = (await import(
    `./settings.ts?flagSettingsActual=${importStamp}`
  )) as SettingsModule
  const { resolveOutOfProcessTeammateProviderFromCliArgs } = await import(
    `../../services/api/agentRouting.ts?flagSettingsActual=${importStamp}`
  )

  expect(loadResult).toEqual({ ok: true })
  expect(getFlagSettingsPath()).toBe(settingsPath)
  expect(
    resolveOutOfProcessTeammateProviderFromCliArgs(
      args,
      getInitialSettings(),
    ),
  ).toEqual({
    model: routedModel,
    baseURL: 'https://api.deepseek.example/v1',
    apiKey: 'sk-deepseek-worker',
  })
})

function writeSettingsFile(settings: unknown): string {
  const path = join(tempDir, 'settings.json')
  writeFileSync(path, `${JSON.stringify(settings)}\n`, 'utf8')
  return path
}

function resetSettingsBootstrapState(): void {
  setFlagSettingsPath(undefined)
  setFlagSettingsInline(null)
  resetSettingsCache()
}
