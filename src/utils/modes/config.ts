import { getInitialSettings } from '../settings/settings.js'
import type {
  ResolvedTersaMode,
  ResolvedTersaModesConfig,
  TersaModeIntensity,
  TersaPromptModeId,
  TersaModeProfile,
  TersaModesSettings,
} from './types.js'
import { getModeDefinition, listPromptModeDefinitions, renderModePrompt } from './registry.js'

const DEFAULT_PROFILE: TersaModeProfile = 'minimal'
const DEFAULT_INTENSITY: TersaModeIntensity = 'full'

const DEFAULT_ENABLED: Record<TersaModeProfile, Record<TersaPromptModeId, boolean>> = {
  minimal: {
    karpathy: true,
    superpowers: false,
    gsd: false,
    designer: false,
    efficiency: false,
  },
  standard: {
    karpathy: true,
    superpowers: true,
    gsd: false,
    designer: false,
    efficiency: false,
  },
  'full-auto': {
    karpathy: true,
    superpowers: true,
    gsd: true,
    designer: true,
    efficiency: false,
  },
}

function resolveMode(
  profile: TersaModeProfile,
  settings: TersaModesSettings | undefined,
  id: TersaPromptModeId,
): ResolvedTersaMode {
  const definition = getModeDefinition(id)
  const modeSettings = settings?.[id]

  return {
    id,
    label: definition.label,
    description: definition.description,
    enabled: modeSettings?.enabled ?? DEFAULT_ENABLED[profile][id],
    intensity: modeSettings?.intensity ?? DEFAULT_INTENSITY,
  }
}

export function getTersaModesConfig(
  settings: TersaModesSettings | undefined = getInitialSettings().modes,
): ResolvedTersaModesConfig {
  const profile = settings?.profile ?? DEFAULT_PROFILE

  return {
    profile,
    modes: {
      karpathy: resolveMode(profile, settings, 'karpathy'),
      superpowers: resolveMode(profile, settings, 'superpowers'),
      gsd: resolveMode(profile, settings, 'gsd'),
      designer: resolveMode(profile, settings, 'designer'),
      efficiency: resolveMode(profile, settings, 'efficiency'),
    },
  }
}

export function getTersaModePromptSection(
  settings?: TersaModesSettings | null,
): string | null {
  const config = getTersaModesConfig(settings ?? undefined)
  const enabledModes = listPromptModeDefinitions()
    .map(definition => config.modes[definition.id])
    .filter(mode => mode.enabled)

  if (enabledModes.length === 0) {
    return null
  }

  const lines = [
    `# Active modes`,
    `Profile: ${config.profile}`,
  ]

  for (const mode of enabledModes) {
    lines.push(`${mode.label}: ${renderModePrompt(mode)}`)
  }

  return lines.join('\n')
}

export function getTersaModeStatusRows(
  settings?: TersaModesSettings | null,
): Array<[string, string]> {
  const config = getTersaModesConfig(settings ?? undefined)
  return [
    ['Profile', config.profile],
    ['Karpathy', config.modes.karpathy.enabled ? config.modes.karpathy.intensity : 'off'],
    ['Super', config.modes.superpowers.enabled ? config.modes.superpowers.intensity : 'off'],
    ['GSD', config.modes.gsd.enabled ? config.modes.gsd.intensity : 'off'],
    ['Designer', config.modes.designer.enabled ? config.modes.designer.intensity : 'off'],
    ['Efficiency', config.modes.efficiency.enabled ? config.modes.efficiency.intensity : 'off'],
  ]
}
