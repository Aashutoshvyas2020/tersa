import type { Message } from '../types/message.js'
import { randomUUID } from 'src/utils/crypto.js'

export type SessionCanaryResult =
  | 'hit'
  | 'miss'
  | 'ineligible'
  | null

export type SessionCanaryState = {
  enabled: boolean
  marker: string
  consecutiveMisses: number
  totalHits: number
  totalMisses: number
  suppressedForSession: boolean
  lastResult: SessionCanaryResult
}

export type SessionCanaryStreamState = {
  awaitingFirstVisibleTextBlock: boolean
  active: boolean
  buffer: string
}

export function generateSessionCanaryMarker(): string {
  const randomHex = randomUUID()
    .replaceAll('-', '')
    .slice(0, 4)
    .toLowerCase()
  return `<tersa-canary:${randomHex}>`
}

export function createSessionCanaryState(
  enabled = false,
  marker = generateSessionCanaryMarker(),
): SessionCanaryState {
  return {
    enabled,
    marker,
    consecutiveMisses: 0,
    totalHits: 0,
    totalMisses: 0,
    suppressedForSession: false,
    lastResult: null,
  }
}

export function resetSessionCanaryState(
  state: SessionCanaryState,
  enabled = state.enabled,
  marker = generateSessionCanaryMarker(),
): SessionCanaryState {
  const next = createSessionCanaryState(enabled, marker)
  state.enabled = next.enabled
  state.marker = next.marker
  state.consecutiveMisses = next.consecutiveMisses
  state.totalHits = next.totalHits
  state.totalMisses = next.totalMisses
  state.suppressedForSession = next.suppressedForSession
  state.lastResult = next.lastResult
  return state
}

export function createSessionCanaryStreamState(): SessionCanaryStreamState {
  return {
    awaitingFirstVisibleTextBlock: true,
    active: false,
    buffer: '',
  }
}

export function resetSessionCanaryStreamState(
  state: SessionCanaryStreamState,
): SessionCanaryStreamState {
  state.awaitingFirstVisibleTextBlock = true
  state.active = false
  state.buffer = ''
  return state
}

export function stripSessionCanaryPrefix(
  text: string,
  marker: string,
): {
  text: string
  matched: boolean
  pending: boolean
} {
  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? ''
  const body = text.slice(leadingWhitespace.length)

  if (body.startsWith(marker)) {
    return {
      text: body.slice(marker.length),
      matched: true,
      pending: false,
    }
  }

  if (body.length === 0) {
    return {
      text,
      matched: false,
      pending: true,
    }
  }

  if (marker.startsWith(body)) {
    return {
      text: '',
      matched: false,
      pending: true,
    }
  }

  return {
    text,
    matched: false,
    pending: false,
  }
}

export function consumeSessionCanaryStreamText(
  state: SessionCanaryStreamState,
  chunk: string,
  marker: string,
): string | null {
  if (!state.awaitingFirstVisibleTextBlock) {
    return chunk
  }

  state.active = true
  state.buffer += chunk

  const result = stripSessionCanaryPrefix(state.buffer, marker)
  if (result.pending) {
    return null
  }

  state.awaitingFirstVisibleTextBlock = false
  state.active = false
  const visibleText = result.matched ? result.text : state.buffer
  state.buffer = ''
  return visibleText
}

export function finishSessionCanaryStreamText(
  state: SessionCanaryStreamState,
  marker: string,
): string | null {
  if (!state.awaitingFirstVisibleTextBlock) {
    return null
  }

  const result = stripSessionCanaryPrefix(state.buffer, marker)
  if (result.pending && state.buffer.trim().length === 0) {
    state.active = false
    return null
  }

  state.awaitingFirstVisibleTextBlock = false
  state.active = false
  const visibleText = result.matched ? result.text : state.buffer
  state.buffer = ''
  return visibleText
}

function isAssistantMessage(message: Message): boolean {
  return Boolean(message && typeof message === 'object' && message.type === 'assistant')
}

function getAssistantContent(message: Message): unknown {
  if (!isAssistantMessage(message)) return null
  return message.message?.content ?? message.content ?? null
}

function isVisibleText(text: string): boolean {
  return text.trim().length > 0
}

function sanitizeAssistantContent(
  content: unknown,
  marker: string,
): {
  content: unknown
  eligible: boolean
  matched: boolean
} {
  if (typeof content === 'string') {
    const stripped = stripSessionCanaryPrefix(content, marker)
    const visibleText = stripped.matched ? stripped.text : content
    return {
      content: visibleText,
      eligible: isVisibleText(visibleText),
      matched: stripped.matched,
    }
  }

  if (!Array.isArray(content)) {
    return {
      content,
      eligible: false,
      matched: false,
    }
  }

  let leadingWhitespace = ''
  let firstVisibleTextBlockIndex = -1

  for (let i = 0; i < content.length; i += 1) {
    const block = content[i]
    if (block?.type !== 'text') continue
    const text = typeof block.text === 'string' ? block.text : ''
    if (text.trim().length === 0 && firstVisibleTextBlockIndex === -1) {
      leadingWhitespace += text
      continue
    }
    firstVisibleTextBlockIndex = i
    break
  }

  if (firstVisibleTextBlockIndex === -1) {
    return {
      content,
      eligible: false,
      matched: false,
    }
  }

  const firstVisibleBlock = content[firstVisibleTextBlockIndex]
  const firstVisibleText =
    typeof firstVisibleBlock?.text === 'string' ? firstVisibleBlock.text : ''
  const stripped = stripSessionCanaryPrefix(
    `${leadingWhitespace}${firstVisibleText}`,
    marker,
  )

  const nextContent = content.map((block, index) => {
    if (index === firstVisibleTextBlockIndex) {
      return {
        ...block,
        text: stripped.matched ? stripped.text : firstVisibleText,
      }
    }
    return block
  })

  return {
    content: nextContent,
    eligible: nextContent.some(block => {
      if (block?.type !== 'text') return false
      return isVisibleText(typeof block.text === 'string' ? block.text : '')
    }),
    matched: stripped.matched,
  }
}

export function sanitizeSessionCanaryAssistantMessage(
  message: Message,
  marker: string,
): {
  message: Message
  eligible: boolean
  matched: boolean
} {
  if (!isAssistantMessage(message)) {
    return {
      message,
      eligible: false,
      matched: false,
    }
  }

  const content = getAssistantContent(message)
  const sanitized = sanitizeAssistantContent(content, marker)
  return {
    message: buildAssistantMessage(message, sanitized.content),
    eligible: sanitized.eligible,
    matched: sanitized.matched,
  }
}

export function finalizeSessionCanaryAssistantMessage(
  message: Message,
  state: SessionCanaryState,
): {
  message: Message
  eligible: boolean
  matched: boolean
  alert: boolean
  result: Exclude<SessionCanaryResult, null>
} {
  if (!state.enabled || !isAssistantMessage(message)) {
    state.lastResult = 'ineligible'
    return {
      message,
      eligible: false,
      matched: false,
      alert: false,
      result: 'ineligible',
    }
  }

  const sanitized = sanitizeSessionCanaryAssistantMessage(message, state.marker)
  const nextMessage = sanitized.message

  if (!sanitized.eligible) {
    state.lastResult = 'ineligible'
    return {
      message: nextMessage,
      eligible: false,
      matched: sanitized.matched,
      alert: false,
      result: 'ineligible',
    }
  }

  if (sanitized.matched) {
    state.consecutiveMisses = 0
    state.totalHits += 1
    state.lastResult = 'hit'
    return {
      message: nextMessage,
      eligible: true,
      matched: true,
      alert: false,
      result: 'hit',
    }
  }

  state.consecutiveMisses += 1
  state.totalMisses += 1
  state.lastResult = 'miss'
  const alert =
    !state.suppressedForSession && state.consecutiveMisses >= 3

  return {
    message: nextMessage,
    eligible: true,
    matched: false,
    alert,
    result: 'miss',
  }
}

export function suppressSessionCanaryWarningsForSession(
  state: SessionCanaryState,
): SessionCanaryState {
  state.suppressedForSession = true
  return state
}

export function setSessionCanaryEnabled(
  state: SessionCanaryState,
  enabled: boolean,
): SessionCanaryState {
  if (state.enabled === enabled) {
    return state
  }

  state.enabled = enabled
  state.consecutiveMisses = 0
  state.lastResult = null
  if (!enabled) {
    state.suppressedForSession = false
  }
  return state
}

export function resetSessionCanaryMissStreak(
  state: SessionCanaryState,
): SessionCanaryState {
  state.consecutiveMisses = 0
  state.lastResult = null
  return state
}

function buildAssistantMessage(message: Message, content: unknown): Message {
  if (!isAssistantMessage(message)) return message

  if (message.message && typeof message.message === 'object') {
    return {
      ...message,
      message: {
        ...message.message,
        content,
      },
    }
  }

  return {
    ...message,
    content,
  }
}
