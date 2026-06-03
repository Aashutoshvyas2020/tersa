import { getInitialSettings } from '../settings/settings.js'
import { isEnvTruthy } from '../envUtils.js'
import type { CaveModeConfig } from './types.js'

export const DEFAULT_CAVE_MODE_CONFIG: CaveModeConfig = {
  enabled: true,
  toolCompression: true,
  structuredCompression: true,
  readDeduplication: true,
  mlCompression: false,
  intensity: 'full',
}

export function getCaveModeConfig(): CaveModeConfig {
  const settings = getInitialSettings().caveMode ?? {}
  const merged: CaveModeConfig = {
    ...DEFAULT_CAVE_MODE_CONFIG,
    ...settings,
  }

  if (process.env.OPENCLAUDE_CAVE_MODE === '0') {
    return { ...merged, enabled: false }
  }

  if (process.env.OPENCLAUDE_CAVE_MODE === '1' || isEnvTruthy(process.env.OPENCLAUDE_CAVE_MODE)) {
    return { ...merged, enabled: true }
  }

  if (merged.intensity === 'off') {
    return { ...merged, enabled: false }
  }

  return merged
}
