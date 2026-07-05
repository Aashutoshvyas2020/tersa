import { describe, expect, test } from 'bun:test'
import React from 'react'

import { renderToString } from '../../utils/staticRender.js'
import { renderStatusLineInputGuide } from './StatusLineConfigDialog.js'

describe('status line input guide', () => {
  test('falls back to Esc when the terminal does not provide a key label', async () => {
    const output = await renderToString(
      renderStatusLineInputGuide({ pending: false, keyName: '' } as any, 80),
      80,
    )

    expect(output).toContain('R reset · Esc cancel')
  })

  test('keeps the narrow guide on one line', async () => {
    const output = await renderToString(
      renderStatusLineInputGuide({ pending: false, keyName: 'Esc' } as any, 60),
      60,
    )

    expect(output.trim().split('\n')).toHaveLength(1)
    expect(output).toContain('Enter save · Esc cancel')
  })
})
