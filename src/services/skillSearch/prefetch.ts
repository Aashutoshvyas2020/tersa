import type { ToolUseContext } from '../../Tool.js'
import type { Message } from '../../types/message.js'

export type PendingSkillDiscoveryPrefetch = {
  readonly disabled: true
}

export function startSkillDiscoveryPrefetch(
  _input: string | null,
  _messages: Message[],
  _toolUseContext: ToolUseContext,
): PendingSkillDiscoveryPrefetch | null {
  return null
}

export async function collectSkillDiscoveryPrefetch(
  _pending: PendingSkillDiscoveryPrefetch,
): Promise<never[]> {
  return []
}

export async function getTurnZeroSkillDiscovery(
  _input: string,
  _messages: Message[],
  _context: unknown,
): Promise<never[]> {
  return []
}
