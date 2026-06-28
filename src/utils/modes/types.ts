export type TersaPromptModeId =
  | 'karpathy'
  | 'superpowers'
  | 'gsd'
  | 'designer'
  | 'efficiency'

export type TersaModeId = 'cave' | TersaPromptModeId

export type TersaModeIntensity =
  | 'lite'
  | 'full'
  | 'ultra'
  | 'wenyan-lite'
  | 'wenyan-full'
export type TersaModeProfile = 'minimal' | 'standard' | 'full-auto'

export type TersaModeSettings = {
  enabled?: boolean
  intensity?: TersaModeIntensity
}

export type TersaModesSettings = {
  profile?: TersaModeProfile
  karpathy?: TersaModeSettings
  superpowers?: TersaModeSettings
  gsd?: TersaModeSettings
  designer?: TersaModeSettings
  efficiency?: TersaModeSettings
}

export type ResolvedTersaMode = {
  id: TersaPromptModeId
  label: string
  description: string
  enabled: boolean
  intensity: TersaModeIntensity
}

export type ResolvedTersaModesConfig = {
  profile: TersaModeProfile
  modes: Record<TersaPromptModeId, ResolvedTersaMode>
}
