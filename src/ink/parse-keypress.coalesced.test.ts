import { expect, test } from 'bun:test'

import { InputEvent } from './events/input-event.ts'
import {
  INITIAL_STATE,
  parseMultipleKeypresses,
  type ParsedKey,
} from './parse-keypress.ts'

test('splits a coalesced raw control key from adjacent printable text', () => {
  const sequence = String.fromCharCode(1) + 'start '
  const [items] = parseMultipleKeypresses(INITIAL_STATE, sequence)
  const events = items.map(item => new InputEvent(item as ParsedKey))

  expect(events.map(event => ({ input: event.input, ctrl: event.key.ctrl }))).toEqual([
    { input: 'a', ctrl: true },
    { input: 'start ', ctrl: false },
  ])
})
