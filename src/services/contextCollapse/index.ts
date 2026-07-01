import type { QuerySource } from '../../constants/querySource.js'
import type { ToolUseContext } from '../../Tool.js'
import type { AssistantMessage, Message } from '../../types/message.js'

// Context collapse is not included in the open source snapshot. These
// compatibility functions preserve the non-collapse path when the feature is off.
export function isContextCollapseEnabled(): boolean {
  return false
}

export function getContextCollapseState(): null {
  return null
}

export function resetContextCollapse(): void {
  return
}

export function initContextCollapse(): never {
  throw new Error('contextCollapse is unavailable in this Tersa source snapshot')
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: ToolUseContext,
  _querySource: QuerySource,
): Promise<{ messages: Message[] }> {
  return { messages }
}

export function isWithheldPromptTooLong(
  _message: AssistantMessage,
  _isPromptTooLongMessage: (message: AssistantMessage) => boolean,
  _querySource: QuerySource,
): boolean {
  return false
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource: QuerySource,
): { messages: Message[]; committed: number } {
  return { messages, committed: 0 }
}
