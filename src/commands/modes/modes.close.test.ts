import { describe, expect, test } from 'bun:test'
import { finishModesCommand } from './modes.js'

describe('finishModesCommand', () => {
  test('skips transcript output when an untouched dialog is cancelled', () => {
    const calls: unknown[][] = []
    const onDone = (...args: unknown[]) => {
      calls.push(args)
    }

    finishModesCommand(onDone as never, false)

    expect(calls).toEqual([[undefined, { display: 'skip' }]])
  })

  test('reports an update after a mode changed', () => {
    const calls: unknown[][] = []
    const onDone = (...args: unknown[]) => {
      calls.push(args)
    }

    finishModesCommand(onDone as never, true)

    expect(calls).toEqual([['Modes updated', { display: 'system' }]])
  })
})
