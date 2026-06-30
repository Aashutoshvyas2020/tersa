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

export type MessageRecord = Record<string, any>

export type Message = MessageRecord
export type NormalizedMessage = MessageRecord
export type RenderableMessage = MessageRecord
export type AssistantMessage = MessageRecord
export type NormalizedAssistantMessage = MessageRecord
export type UserMessage = MessageRecord
export type NormalizedUserMessage = MessageRecord
export type SystemMessage = MessageRecord
export type SystemAPIErrorMessage = MessageRecord
export type SystemAwaySummaryMessage = MessageRecord
export type SystemBridgeStatusMessage = MessageRecord
export type SystemCompactBoundaryMessage = MessageRecord
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
export type CompactMetadata = MessageRecord

export type AttachmentMessage<T = any> = MessageRecord & {
  attachment?: T
}

export type ProgressMessage<T = any> = MessageRecord & {
  data?: T
}

export type SystemMessageLevel =
  | 'debug'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | string

export type PartialCompactDirection = 'from' | 'up_to'
