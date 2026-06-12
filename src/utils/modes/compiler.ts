import type { TersaModeIntensity } from './types.js'
import { compressInternalPromptText } from '../internalPromptCompression.js'

export function compileModePrompt(
  text: string,
  intensity: TersaModeIntensity,
): string {
  return compressInternalPromptText(text, intensity)
}
