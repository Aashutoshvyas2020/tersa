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
export type NormalizedAssistantMessage<T = any> = MessageRecord
export type UserMessage = MessageRecord
export type NormalizedUserMessage = MessageRecord
export type SystemMessage = MessageRecord
export type SystemAPIErrorMessage = MessageRecord
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
export type SystemStopHookSummaryMessage = MessageRecord
export type SystemThinkingMessage = MessageRecord
export type SystemTurnDurationMessage = MessageRecord
export type TombstoneMessage = MessageRecord
export type ToolUseSummaryMessage = MessageRecord
export type HookResultMessage = MessageRecord
export type GroupedToolUseMessage = MessageRecord
export type CollapsedReadSearchGroup = MessageRecord
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
export type AttachmentMessage<T = any> = MessageRecord & { attachment?: T }
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
