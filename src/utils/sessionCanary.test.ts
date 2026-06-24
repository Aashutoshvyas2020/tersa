import { expect, test } from 'bun:test'
import { getSessionCanaryState, setSessionCanaryState } from 'src/bootstrap/state.js'
import { handleMessageFromStream } from './messages.js'
import {
  consumeSessionCanaryStreamText,
  createSessionCanaryState,
  createSessionCanaryStreamState,
  finalizeSessionCanaryAssistantMessage,
  generateSessionCanaryMarker,
  stripSessionCanaryPrefix,
} from './sessionCanary.js'

test('generates a short hidden session canary marker', () => {
  const marker = generateSessionCanaryMarker()

  expect(marker).toMatch(/^<tersa-canary:[0-9a-f]{4}>$/)
})

test('session canary defaults to disabled', () => {
  expect(createSessionCanaryState().enabled).toBe(false)
})

test('strips a leading canary marker after insignificant whitespace', () => {
  const marker = '<tersa-canary:7f2a>'

  expect(stripSessionCanaryPrefix('   \n\t<tersa-canary:7f2a>Hello', marker)).toEqual(
    {
      text: 'Hello',
      matched: true,
      pending: false,
    },
  )
})

test('treats a late marker as a miss', () => {
  const marker = '<tersa-canary:7f2a>'

  expect(stripSessionCanaryPrefix('Hello <tersa-canary:7f2a>', marker)).toEqual(
    {
      text: 'Hello <tersa-canary:7f2a>',
      matched: false,
      pending: false,
    },
  )
})

test('buffers the first text block until the canary decision is clear', () => {
  const marker = '<tersa-canary:7f2a>'
  const state = createSessionCanaryStreamState()

  expect(consumeSessionCanaryStreamText(state, '   <tersa-ca', marker)).toBeNull()
  expect(consumeSessionCanaryStreamText(state, 'nary:7f2a>Hello', marker)).toBe(
    'Hello',
  )
})

test('counts three consecutive eligible misses as a warning', () => {
  const state = createSessionCanaryState(true)
  const marker = state.marker

  const first = finalizeSessionCanaryAssistantMessage(
    assistantMessage('No marker here'),
    state,
  )
  expect(first.result).toBe('miss')
  expect(first.alert).toBe(false)

  const second = finalizeSessionCanaryAssistantMessage(
    assistantMessage('Still no marker'),
    state,
  )
  expect(second.result).toBe('miss')
  expect(second.alert).toBe(false)

  const third = finalizeSessionCanaryAssistantMessage(
    assistantMessage('Still missing'),
    state,
  )
  expect(third.result).toBe('miss')
  expect(third.alert).toBe(true)

  const fourth = finalizeSessionCanaryAssistantMessage(
    assistantMessage(`${marker}Recovered`),
    state,
  )
  expect(fourth.result).toBe('hit')
  expect(state.consecutiveMisses).toBe(0)
})

test('ignores tool-only assistant turns', () => {
  const state = createSessionCanaryState(true)

  const result = finalizeSessionCanaryAssistantMessage(
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: 'tool_1', name: 'Read', input: {} },
        ],
      },
    },
    state,
  )

  expect(result.result).toBe('ineligible')
  expect(result.alert).toBe(false)
  expect(state.consecutiveMisses).toBe(0)
})

test('stream handler strips the hidden canary marker from streaming text', () => {
  const original = { ...getSessionCanaryState() }
  const state = createSessionCanaryState(true, '<tersa-canary:7f2a>')
  setSessionCanaryState(state)
  let streamingText = ''

  try {
    handleMessageFromStream(
      streamTextDelta('   <tersa-ca'),
      () => {},
      () => {},
      () => {},
      () => {},
      undefined,
      undefined,
      undefined,
      updater => {
        streamingText = updater(streamingText) ?? ''
      },
    )
    handleMessageFromStream(
      streamTextDelta('nary:7f2a>Hello'),
      () => {},
      () => {},
      () => {},
      () => {},
      undefined,
      undefined,
      undefined,
      updater => {
        streamingText = updater(streamingText) ?? ''
      },
    )

    expect(streamingText).toBe('Hello')
  } finally {
    setSessionCanaryState(original)
  }
})

test('stream handler alerts after three eligible canary misses', () => {
  const original = { ...getSessionCanaryState() }
  const state = createSessionCanaryState(true, '<tersa-canary:7f2a>')
  setSessionCanaryState(state)
  let alerts = 0

  try {
    for (const text of ['No marker', 'Still no marker', 'Still missing']) {
      handleMessageFromStream(
        assistantMessage(text),
        () => {},
        () => {},
        () => {},
        () => {},
        undefined,
        undefined,
        undefined,
        undefined,
        () => {
          alerts += 1
        },
      )
    }

    expect(alerts).toBe(1)
    expect(state.consecutiveMisses).toBe(3)
  } finally {
    setSessionCanaryState(original)
  }
})

test('internal assistant turns can bypass canary evaluation', () => {
  const original = { ...getSessionCanaryState() }
  const state = createSessionCanaryState(true, '<tersa-canary:7f2a>')
  setSessionCanaryState(state)

  try {
    handleMessageFromStream(
      assistantMessage('No marker'),
      () => {},
      () => {},
      () => {},
      () => {},
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
    )

    expect(state.consecutiveMisses).toBe(0)
    expect(state.lastResult).toBeNull()
  } finally {
    setSessionCanaryState(original)
  }
})

function assistantMessage(text: string): Record<string, unknown> {
  return {
    type: 'assistant',
    message: {
      content: [{ type: 'text', text }],
    },
  }
}

function streamTextDelta(text: string): Record<string, unknown> {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: {
        type: 'text_delta',
        text,
      },
    },
  }
}
