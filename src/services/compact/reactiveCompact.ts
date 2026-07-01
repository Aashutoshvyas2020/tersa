import type { Message } from '../../types/message.js'
import type { CompactionResult } from './compact.js'

export type ReactiveCompactFailureReason =
  | 'too_few_groups'
  | 'aborted'
  | 'exhausted'
  | 'error'
  | 'media_unstrippable'

export type ReactiveCompactOutcome =
  | { ok: true; result: CompactionResult }
  | { ok: false; reason: ReactiveCompactFailureReason }

export function isReactiveCompactEnabled(): boolean {
  return false
}

export function isReactiveOnlyMode(): boolean {
  return false
}

export function isWithheldPromptTooLong(_message: Message): boolean {
  return false
}

export function isWithheldMediaSizeError(
  _message: Message | undefined,
): boolean {
  return false
}

export async function tryReactiveCompact(
  _params: unknown,
): Promise<CompactionResult | null> {
  return null
}

export async function reactiveCompactOnPromptTooLong(
  _messages: Message[],
  _cacheSafeParams: unknown,
  _options: unknown,
): Promise<ReactiveCompactOutcome> {
  return { ok: false, reason: 'error' }
}
