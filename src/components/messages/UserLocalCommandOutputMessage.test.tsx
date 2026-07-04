import { describe, expect, test } from 'bun:test'
import React from 'react'

import { stringWidth } from '../../ink/stringWidth.js'
import { AppStateProvider } from '../../state/AppState.js'
import { renderToString } from '../../utils/staticRender.js'
import { UserLocalCommandOutputMessage } from './UserLocalCommandOutputMessage.js'

describe('UserLocalCommandOutputMessage responsive layout', () => {
  test('keeps the gutter with the first line and indents wrapped lines', async () => {
    const width = 40
    const content =
      '<local-command-stdout>A long command result that should wrap without leaving a blank tree gutter or returning to the left edge.</local-command-stdout>'
    const output = await renderToString(
      <AppStateProvider>
        <UserLocalCommandOutputMessage content={content} />
      </AppStateProvider>,
      width,
    )
    const lines = output.split('\n').filter(line => line.trim())

    expect(lines[0]).toContain('└')
    expect(lines[0]).toContain('A long command')
    expect(lines.slice(1).every(line => line.startsWith('     '))).toBe(true)
    expect(Math.max(...lines.map(line => stringWidth(line)))).toBeLessThanOrEqual(width)
  })
})
