export type MCPServerStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'failed'
  | 'needs-auth'
  | string

export type BaseServerInfo = {
  name: string
  status?: MCPServerStatus
  type?: string
  scope?: string
  tools?: unknown[]
  error?: string
  [key: string]: unknown
}

export type StdioServerInfo = BaseServerInfo & {
  type?: 'stdio'
  command?: string
  args?: string[]
  env?: Record<string, string>
}

export type HTTPServerInfo = BaseServerInfo & {
  type?: 'http'
  url?: string
  headers?: Record<string, string>
}

export type SSEServerInfo = BaseServerInfo & {
  type?: 'sse'
  url?: string
  headers?: Record<string, string>
}

export type ClaudeAIServerInfo = BaseServerInfo & {
  type?: 'claude.ai'
  url?: string
}

export type AgentMcpServerInfo = BaseServerInfo & {
  type?: 'agent'
  agentName?: string
}

export type ServerInfo =
  | StdioServerInfo
  | HTTPServerInfo
  | SSEServerInfo
  | ClaudeAIServerInfo
  | AgentMcpServerInfo

export type MCPViewState =
  | { type: string; server?: ServerInfo; [key: string]: unknown }
  | string
