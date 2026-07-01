export type ViewState =
  | { type: 'menu' }
  | { type: 'help' }
  | { type: 'validate'; path?: string }
  | {
      type: 'browse-marketplace'
      targetMarketplace: string
      targetPlugin?: string
    }
  | { type: 'discover-plugins'; targetPlugin?: string }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: 'enable' | 'disable' | 'uninstall'
    }
  | {
      type: 'manage-marketplaces'
      targetMarketplace?: string
      action?: 'remove' | 'update'
    }
  | { type: 'marketplace-list' }
  | { type: 'add-marketplace'; initialValue?: string }
  | { type: 'marketplace-menu' }

export type PluginSettingsProps = {
  onComplete: (message?: string) => void
  args: string
  showMcpRedirectMessage?: boolean
}
