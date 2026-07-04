import { describe, expect, test } from 'bun:test'
import { Writable } from 'stream'
import { writeDiffToTerminal } from './terminal.js'
import { CURSOR_HOME, ERASE_SCREEN, ERASE_SCROLLBACK } from './termio/csi.js'

function captureTerminalOutput(): {
  terminal: { stdout: Writable; stderr: Writable }
  read: () => string
} {
  let output = ''
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  })
  const stderr = new Writable({
    write(_chunk, _encoding, callback) {
      callback()
    },
  })
  return { terminal: { stdout, stderr }, read: () => output }
}

describe('writeDiffToTerminal scrollback preservation', () => {
  test('full frame redraw clears only the viewport', () => {
    const capture = captureTerminalOutput()

    writeDiffToTerminal(
      capture.terminal,
      [{ type: 'clearTerminal', reason: 'layout-change' } as never],
      true,
    )

    expect(capture.read()).toContain(ERASE_SCREEN)
    expect(capture.read()).toContain(CURSOR_HOME)
    expect(capture.read()).not.toContain(ERASE_SCROLLBACK)
  })
})
