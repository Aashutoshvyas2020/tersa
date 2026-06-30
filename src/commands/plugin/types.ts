import type { LoadedPlugin } from '../../types/plugin.js'

export type ViewState =
  | {
      type: string
      initialValue?: string
      plugin?: LoadedPlugin
      pluginId?: string
      marketplace?: string
      target?: string
      [key: string]: unknown
    }
  | string

export type PluginSettingsProps = {
  onComplete: (message?: string) => void
  args: string
  showMcpRedirectMessage?: boolean
}
