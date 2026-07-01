/*
 * Compatibility types for the SDK control protocol.
 *
 * Runtime input is validated by controlSchemas.ts. The open-source snapshot
 * omits several internal request variants, so the shared envelopes remain
 * extensible while public request/response payloads keep their known fields.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SDKControlInitializeRequest = {
  subtype: 'initialize'
  hooks?: Record<string, any[]>
  sdkMcpServers?: string[]
  jsonSchema?: Record<string, unknown>
  systemPrompt?: string
  appendSystemPrompt?: string
  agents?: Record<string, any>
  promptSuggestions?: boolean
  agentProgressSummaries?: boolean
  [key: string]: any
}

export type SDKControlInitializeResponse = {
  commands: any[]
  agents: any[]
  output_style: string
  available_output_styles: string[]
  models: any[]
  account: any
  pid?: number
  fast_mode_state?: 'off' | 'cooldown' | 'on'
  [key: string]: any
}

export type SDKControlMcpSetServersResponse = {
  added: string[]
  removed: string[]
  errors: Record<string, string>
}

export type SDKControlReloadPluginsResponse = {
  commands: any[]
  agents: any[]
  plugins: Array<{ name: string; path: string; source?: string }>
  mcpServers: any[]
  error_count: number
}

export type SDKControlPermissionRequest = {
  subtype: 'can_use_tool'
  tool_name: string
  input: Record<string, unknown>
  permission_suggestions?: any[]
  blocked_path?: string
  decision_reason?: string
  title?: string
  display_name?: string
  tool_use_id: string
  agent_id?: string
  description?: string
  [key: string]: any
}

export type SDKControlRequestInner = {
  subtype: string
  [key: string]: any
}

export type SDKControlRequest = {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
}

export type SDKControlResponse = {
  type: 'control_response'
  response:
    | {
        subtype: 'success'
        request_id: string
        response?: any
      }
    | {
        subtype: 'error'
        request_id: string
        error: string
        pending_permission_requests?: SDKControlRequest[]
      }
}

export type SDKControlCancelRequest = {
  type: 'control_cancel_request'
  request_id: string
}

export type SDKPartialAssistantMessage = {
  type: 'stream_event'
  event: any
  parent_tool_use_id: string | null
  uuid: string
  session_id: string
}

export type StdinMessage = any
export type StdoutMessage = any
