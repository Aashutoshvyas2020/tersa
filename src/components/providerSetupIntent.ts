import { ORDERED_PROVIDER_PRESETS } from '../integrations/index.js'
import type { ProviderPreset } from '../utils/providerProfiles.js'

export type ProviderSetupIntent =
  | 'sign-in'
  | 'api-key'
  | 'local'
  | 'advanced'

const LOCAL_PROVIDER_PRESETS = new Set<ProviderPreset>([
  'lmstudio',
  'atomic-chat',
  'ollama',
])

export function getProviderPresetsForIntent(
  intent: Exclude<ProviderSetupIntent, 'sign-in'>,
): ProviderPreset[] {
  const presets = [...ORDERED_PROVIDER_PRESETS] as ProviderPreset[]
  if (intent === 'local') {
    return presets.filter(preset => LOCAL_PROVIDER_PRESETS.has(preset))
  }
  if (intent === 'api-key') {
    return presets.filter(
      preset => !LOCAL_PROVIDER_PRESETS.has(preset) && preset !== 'custom',
    )
  }
  return presets
}

export function getProviderIntentTitle(intent: ProviderSetupIntent): string {
  switch (intent) {
    case 'sign-in':
      return 'Sign in with an account'
    case 'api-key':
      return 'Use an API key'
    case 'local':
      return 'Connect a local model'
    case 'advanced':
      return 'Advanced provider setup'
  }
}
