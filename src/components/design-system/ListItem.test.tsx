import { describe, expect, test } from 'bun:test'
import React from 'react'

import { stringWidth } from '../../ink/stringWidth.js'
import { renderToString } from '../../utils/staticRender.js'
import { ListItem } from './ListItem.js'

describe('ListItem responsive spacing', () => {
  test('reserves a right-edge gutter for selected rows', async () => {
    const width = 20
    const output = await renderToString(
      <ListItem isFocused={true} isSelected={true}>
        A long selected option
      </ListItem>,
      width,
    )

    const visibleLines = output.split('\n').filter(Boolean)
    expect(Math.max(...visibleLines.map(line => stringWidth(line)))).toBeLessThan(width)
  })
})
