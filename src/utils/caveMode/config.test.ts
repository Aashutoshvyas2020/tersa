import { afterEach, describe, expect, test } from 'bun:test'
import { getCaveModeConfig } from './config.js'
import { SettingsSchema } from '../settings/types.js'

describe('getCaveModeConfig', () => {
  afterEach(() => {
    delete process.env.OPENCLAUDE_CAVE_MODE
  })

  test('env override disables cave mode', () => {
    process.env.OPENCLAUDE_CAVE_MODE = '0'
    expect(getCaveModeConfig()).toMatchObject({ enabled: false })
  })

  test('settings schema accepts caveMode field', () => {
    const result = SettingsSchema().safeParse({
      caveMode: {
        enabled: true,
        toolCompression: true,
        structuredCompression: true,
        readDeduplication: true,
        mlCompression: false,
        intensity: 'full',
      },
    })

    expect(result.success).toBe(true)
  })
})
