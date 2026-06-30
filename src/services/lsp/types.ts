export type LspServerConfig = {
  command: string
  args?: string[]
  extensionToLanguage: Record<string, string>
  transport?: 'stdio' | 'socket'
  env?: Record<string, string>
  initializationOptions?: unknown
  settings?: unknown
  workspaceFolder?: string
  startupTimeout?: number
  shutdownTimeout?: number
  restartOnCrash?: boolean
  maxRestarts?: number
}

export type ScopedLspServerConfig = LspServerConfig & {
  name: string
  pluginName: string
  pluginPath: string
  [key: string]: unknown
}

export type LspServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'failed'
