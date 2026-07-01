import type { Message } from '../../types/message.js'

export const SNIP_NUDGE_TEXT = ''

export function snipCompact() {
  return null
}

export function snipCompactIfNeeded(
  messages: Message[],
  _options?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  executed: boolean
  boundaryMessage?: Message
} {
  return { messages, tokensFreed: 0, executed: false }
}

export function isSnipRuntimeEnabled(): boolean {
  return false
}

export function isSnipMarkerMessage(_message: Message): boolean {
  return false
}

export function shouldNudgeForSnips(_messages?: unknown): boolean {
  return false
}
