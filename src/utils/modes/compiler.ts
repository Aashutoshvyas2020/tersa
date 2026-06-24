import type { TersaModeIntensity } from './types.js'
import { compressInternalPromptText } from '../internalPromptCompression.js'

export function compileModePrompt(
  text: string,
  intensity: TersaModeIntensity,
): string {
  if (intensity === 'ultra') return compressInternalPromptText(text, 'full')
  return compressInternalPromptText(text, intensity)
}
