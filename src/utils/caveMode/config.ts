import { getInitialSettings } from '../settings/settings.js'
import { getSessionSettingsCache } from '../settings/settingsCache.js'
import { isEnvTruthy } from '../envUtils.js'
import type { CaveModeConfig } from './types.js'

export const DEFAULT_CAVE_MODE_CONFIG: CaveModeConfig = {
  enabled: true,
  toolCompression: true,
  structuredCompression: true,
  readDeduplication: true,
  mlCompression: false,
  skillPromptCompression: true,
  skillPromptCompressionStyle: 'full',
  softHistoryCompression: true,
  rtkRewrite: true,
  repoMapInjection: true,
  memoryRecallInjection: true,
  historyPreserveRecentCount: 8,
  repoMapTokenBudget: 300,
  memoryRecallTokenBudget: 600,
  intensity: 'full',
}

export function getCaveModeConfig(): CaveModeConfig {
  const settings =
    getSessionSettingsCache()?.settings.caveMode ??
    getInitialSettings().caveMode ??
    {}
  const merged: CaveModeConfig = {
    ...DEFAULT_CAVE_MODE_CONFIG,
    ...settings,
  }

  if (process.env.TERSA_CAVE_MODE === '0') {
    return { ...merged, enabled: false }
  }

  if (
    process.env.TERSA_CAVE_MODE === '1' ||
    isEnvTruthy(process.env.TERSA_CAVE_MODE)
  ) {
    return { ...merged, enabled: true }
  }

  if (merged.intensity === 'off') {
    return { ...merged, enabled: false }
  }

  return merged
}
