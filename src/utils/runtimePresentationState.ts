import type { EffortValue } from './effort.js'
import { getDisplayedEffortLevel } from './effort.js'
import { renderModelSetting, type ModelSetting } from './model/model.js'
import { resolveTersaProviderStatus } from './tersaStatus.js'
import { redactUrlForDisplay } from './urlRedaction.js'

export type RuntimePresentationState = {
  provider: string
  model: string
  effort: string
  endpoint: string
  isLocal: boolean
}

export function getRuntimePresentationState(
  model: ModelSetting,
  effortValue: EffortValue | undefined,
): RuntimePresentationState {
  const effectiveModel = model ?? 'default'
  const provider = resolveTersaProviderStatus(model ?? undefined)

  return {
    provider: provider.name,
    model: renderModelSetting(effectiveModel),
    effort: getDisplayedEffortLevel(effectiveModel, effortValue),
    endpoint: redactUrlForDisplay(provider.baseUrl),
    isLocal: provider.isLocal,
  }
}
