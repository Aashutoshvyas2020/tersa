import { describe, expect, test } from 'bun:test'
import React from 'react'

import { stringWidth } from '../../ink/stringWidth.js'
import { renderToString } from '../../utils/staticRender.js'
import { Select } from './select.js'

describe('Select compact-vertical responsive layout', () => {
  test('separates indexes and reserves a right-edge gutter', async () => {
    const width = 30
    const output = await renderToString(
      <Select
        layout="compact-vertical"
        defaultValue="first"
        options={[
          {
            label: 'First option',
            value: 'first',
            description: 'A deliberately long description that wraps cleanly',
          },
          { label: 'Second option', value: 'second', description: 'Short' },
        ]}
      />,
      width,
    )

    expect(output).toContain('1. First option')
    const visibleLines = output.split('\n').filter(Boolean)
    expect(Math.max(...visibleLines.map(line => stringWidth(line)))).toBeLessThan(width)
  })
})
