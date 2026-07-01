import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { UUID } from 'crypto'

/**
 * Compatibility message contracts for the open-source snapshot.
 *
 * The original runtime ships a large discriminated message union that is not
 * present in this repository snapshot. These aliases intentionally preserve
 * the structural surface consumed by the application while keeping runtime
 * code unchanged. Individual message producers and renderers continue to
 * validate concrete payloads at their existing boundaries.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type MessageRecord = any

export type Message = MessageRecord
export type NormalizedMessage = MessageRecord
export type RenderableMessage = MessageRecord
export type AssistantMessage = MessageRecord
export type NormalizedAssistantMessage<T = any> = {
  type: 'assistant'
  message: { content: T[]; [key: string]: any }
  [key: string]: any
}
export type UserMessage = MessageRecord
export type NormalizedUserMessage = {
  type: 'user'
  message: { content: any[]; [key: string]: any }
  [key: string]: any
}
export type SystemMessage = {
  type: 'system'
  subtype: string
  [key: string]: any
}
export type SystemAPIErrorMessage = MessageRecord
export type SystemApiMetricsMessage = MessageRecord
export type SystemAwaySummaryMessage = MessageRecord
export type SystemBridgeStatusMessage = MessageRecord
export type SystemCompactBoundaryMessage = {
  type: 'system'
  subtype: 'compact_boundary'
  content: string
  isMeta: boolean
  timestamp: string
  uuid: UUID
  level: SystemMessageLevel
  compactMetadata: CompactMetadata
  logicalParentUuid?: UUID
  [key: string]: any
}
export type SystemFileSnapshotMessage = MessageRecord
export type SystemInformationalMessage = MessageRecord
export type SystemLocalCommandMessage = MessageRecord
export type SystemMemorySavedMessage = MessageRecord
export type SystemMicrocompactBoundaryMessage = MessageRecord
export type SystemPermissionRetryMessage = MessageRecord
export type SystemScheduledTaskFireMessage = MessageRecord
export type SystemStopHookSummaryMessage = {
  type: 'system'
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason?: string
  hasOutput: boolean
  level: SystemMessageLevel
  timestamp: string
  uuid: UUID
  toolUseID?: string
  hookLabel?: string
  totalDurationMs?: number
  [key: string]: any
}
export type SystemAgentsKilledMessage = {
  type: 'system'
  subtype: 'agents_killed'
  timestamp: string
  uuid: UUID
  isMeta: false
}
export type SystemThinkingMessage = MessageRecord
export type SystemTurnDurationMessage = MessageRecord
export type TombstoneMessage = MessageRecord
export type ToolUseSummaryMessage = MessageRecord
export type HookResultMessage = MessageRecord
export type GroupedToolUseMessage = MessageRecord
export type CollapsedReadSearchGroup = MessageRecord
export type CollapsibleMessage =
  | {
      type: 'assistant'
      message: { content: any[]; [key: string]: any }
      [key: string]: any
    }
  | {
      type: 'user'
      message: { content: any[]; [key: string]: any }
      [key: string]: any
    }
  | {
      type: 'grouped_tool_use'
      messages: Array<{ message: { content: any[]; [key: string]: any } }>
      toolName: string
      [key: string]: any
    }
export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }
export type StopHookInfo = {
  command: string
  promptText?: string
  durationMs?: number
}
export type StreamEvent = {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
}
export type RequestStartEvent = {
  type: 'stream_request_start'
}
export type CompactMetadata = {
  trigger: 'manual' | 'auto'
  preTokens: number
  userContext?: string
  messagesSummarized?: number
  preservedSegment?: {
    headUuid: UUID
    tailUuid: UUID
    anchorUuid: UUID
  }
  preCompactDiscoveredTools?: string[]
  [key: string]: any
}
export type AttachmentMessage<T = any> = {
  type: 'attachment'
  attachment: T
  [key: string]: any
}
export type ProgressMessage<T = any> = {
  type: 'progress'
  data: T
  toolUseID: string
  parentToolUseID: string
  uuid: string
  timestamp: string
  [key: string]: any
}

export type SystemMessageLevel =
  | 'debug'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | string

export type PartialCompactDirection = 'from' | 'up_to'
