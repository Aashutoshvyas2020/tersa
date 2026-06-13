import { afterEach, describe, expect, test } from 'bun:test'
import { getCaveModeConfig } from './config.js'
import { SettingsSchema } from '../settings/types.js'

describe('getCaveModeConfig', () => {
  afterEach(() => {
    delete process.env.TERSA_CAVE_MODE
  })

  test('env override disables cave mode', () => {
    process.env.TERSA_CAVE_MODE = '0'
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
        softHistoryCompression: true,
        rtkRewrite: true,
        repoMapInjection: true,
        memoryRecallInjection: true,
        historyPreserveRecentCount: 8,
        repoMapTokenBudget: 300,
        memoryRecallTokenBudget: 600,
        intensity: 'full',
      },
    })

    expect(result.success).toBe(true)
  })

  test('defaults include query-stage cave mode features', () => {
    expect(getCaveModeConfig()).toMatchObject({
      softHistoryCompression: true,
      rtkRewrite: true,
      repoMapInjection: true,
      memoryRecallInjection: true,
    })
  })
})
