import { describe, expect, test } from 'bun:test'
import React from 'react'

import { stringWidth } from '../../ink/stringWidth.js'
import { renderToString } from '../../utils/staticRender.js'
import { ModeDescription } from './ModeDescription.js'

describe('ModeDescription responsive layout', () => {
  test('keeps wrapped lines aligned under the description', async () => {
    const width = 32
    const output = await renderToString(
      <ModeDescription>
        A long description that wraps over multiple terminal rows cleanly.
      </ModeDescription>,
      width,
    )
    const lines = output.split('\n').filter(line => line.trim())

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every(line => line.startsWith('    '))).toBe(true)
    expect(Math.max(...lines.map(line => stringWidth(line)))).toBeLessThan(width)
  })
})
