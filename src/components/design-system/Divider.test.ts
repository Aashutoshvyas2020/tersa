import { describe, expect, test } from 'bun:test'
import { stringWidth } from '../../ink/stringWidth.js'
import { buildDividerParts } from './Divider.js'

describe('responsive divider', () => {
  test('never exceeds its allocated width', () => {
    for (const width of [1, 2, 10, 40, 60, 80, 120]) {
      const parts = buildDividerParts({
        width,
        title: 'A title that can be much longer than the terminal allocation',
      })
      const rendered =
        parts.title === null
          ? parts.left
          : `${parts.left} ${parts.title} ${parts.right}`
      expect(stringWidth(rendered)).toBeLessThanOrEqual(width)
    }
  })

  test('truncates ANSI-styled titles safely', () => {
    const parts = buildDividerParts({
      width: 12,
      title: '\u001b[31mCritical diagnostic heading\u001b[0m',
    })
    const rendered =
      parts.title === null
        ? parts.left
        : `${parts.left} ${parts.title} ${parts.right}`

    expect(stringWidth(rendered)).toBeLessThanOrEqual(12)
    expect(parts.title).not.toBeNull()
  })
})
