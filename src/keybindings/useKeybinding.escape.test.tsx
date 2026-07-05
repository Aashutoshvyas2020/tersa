import { PassThrough } from 'node:stream'

import { expect, test } from 'bun:test'
import React from 'react'

import { Box, Text, createRoot } from '../ink.js'
import { AppStateProvider } from '../state/AppState.js'
import { KeybindingSetup } from './KeybindingProviderSetup.js'
import { useKeybinding } from './useKeybinding.js'

test('plain Escape reaches a Settings confirm:no binding', async () => {
  let called = 0
  const stdout = new PassThrough()
  const stdin = new PassThrough() as PassThrough & {
    isTTY: boolean
    setRawMode: (mode: boolean) => void
    ref: () => void
    unref: () => void
  }
  stdin.isTTY = true
  stdin.setRawMode = () => {}
  stdin.ref = () => {}
  stdin.unref = () => {}
  ;(stdout as unknown as { columns: number }).columns = 80

  function Target() {
    useKeybinding('confirm:no', () => {
      called += 1
    }, { context: 'Settings' })
    return <Box><Text>ready</Text></Box>
  }

  const root = await createRoot({
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    patchConsole: false,
  })
  root.render(<AppStateProvider><KeybindingSetup><Target /></KeybindingSetup></AppStateProvider>)
  await Bun.sleep(50)
  stdin.write('\x1b')
  await Bun.sleep(150)

  expect(called).toBe(1)
  root.unmount()
  stdin.end()
  stdout.end()
})
