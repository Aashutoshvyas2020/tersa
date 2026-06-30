import { describe, expect, test } from 'bun:test'
import React from 'react'
import { stringWidth } from '../../ink/stringWidth.js'
import { renderToString } from '../../utils/staticRender.js'
import { General } from './General.js'

describe('HelpV2 General tab', () => {
  test('presents a concise quick start and essential commands', async () => {
    const output = await renderToString(<General />, 80)

    expect(output).toContain('Start here')
    expect(output).toContain('Describe the outcome')
    expect(output).toContain('Review the plan')
    expect(output).toContain('Inspect /diff')
    expect(output).toContain('Essentials')
    expect(output).toContain('/status')
    expect(output).toContain('/permissions')
    expect(output).toContain('/modes')
    expect(output).not.toContain('Global cave mode')
  })

  test('fits the supported terminal widths without horizontal overflow', async () => {
    for (const width of [40, 60, 80, 120]) {
      const output = await renderToString(<General />, width)
      const visibleLines = output.split('\n')
      expect(
        Math.max(...visibleLines.map(line => stringWidth(line))),
      ).toBeLessThanOrEqual(width)
    }
  })
})
