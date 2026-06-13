import { afterEach, describe, expect, test } from 'bun:test'
import { DEFAULT_CAVE_MODE_CONFIG } from './config.js'
import {
  resetSettingsCache,
  setSessionSettingsCache,
} from '../settings/settingsCache.js'

describe('maybeRewriteBashInputWithRtk', () => {
  afterEach(() => {
    resetSettingsCache()
  })

  test('rewrites command when rtk is available', async () => {
    setSessionSettingsCache({
      settings: { caveMode: DEFAULT_CAVE_MODE_CONFIG },
      errors: [],
    })
    const mod = await import('./rtkRewrite.js')
    mod.resetRtkStatusForTest()
    mod.setRtkExecFileImplForTest(async (_file, args) => ({
      stdout:
        args[0] === '--version' ? 'rtk 1.0.0' : `rewritten:${args[1]}`,
      stderr: '',
    }))
    const result = await mod.maybeRewriteBashInputWithRtk({
      command: 'npm ls --json',
    })

    expect(result.input.command).toBe('rewritten:npm ls --json')
    expect(result.metadata.changed).toBe(true)
  })

  test('fails open when rewrite errors', async () => {
    setSessionSettingsCache({
      settings: { caveMode: DEFAULT_CAVE_MODE_CONFIG },
      errors: [],
    })
    const mod = await import('./rtkRewrite.js')
    mod.resetRtkStatusForTest()
    mod.setRtkExecFileImplForTest(async (_file, args) => {
      if (args[0] === '--version') {
        return { stdout: 'rtk 1.0.0', stderr: '' }
      }
      throw new Error('rewrite failed')
    })
    const result = await mod.maybeRewriteBashInputWithRtk({
      command: 'cat huge.log',
    })

    expect(result.input.command).toBe('cat huge.log')
    expect(result.metadata.attempted).toBe(true)
    expect(result.metadata.changed).toBe(false)
  })

  test('returns original command when rtk is unavailable', async () => {
    setSessionSettingsCache({
      settings: { caveMode: DEFAULT_CAVE_MODE_CONFIG },
      errors: [],
    })
    const mod = await import('./rtkRewrite.js')
    mod.resetRtkStatusForTest()
    mod.setRtkExecFileImplForTest(async () => {
      throw new Error('rtk not found')
    })

    const result = await mod.maybeRewriteBashInputWithRtk({
      command: 'npm ls --json',
    })

    expect(result.input.command).toBe('npm ls --json')
    expect(result.metadata.available).toBe(false)
    expect(result.metadata.attempted).toBe(false)
    expect(result.metadata.changed).toBe(false)
  })
})
