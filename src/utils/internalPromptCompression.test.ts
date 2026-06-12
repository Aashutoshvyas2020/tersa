import { describe, expect, test } from 'bun:test'

import {
  compressInternalPromptText,
  compressTextBlocks,
} from './internalPromptCompression.js'

describe('internalPromptCompression', () => {
  test('preserves code spans while compressing prose', () => {
    const input =
      'Do not change `foo.bar()` before verification.\n\nUse implementation details with care.'
    const output = compressInternalPromptText(input, 'full')

    expect(output).toContain('`foo.bar()`')
    expect(output).toContain('no change')
    expect(output).toContain('pre proof')
    expect(output).toContain('impl details')
  })

  test('supports wenyan style compression', () => {
    const input =
      'Assumptions explicit. If ambiguity changes implementation, ask instead of guessing.'
    const output = compressInternalPromptText(input, 'wenyan-full')

    expect(output).toContain('先明所假')
    expect(output).toContain('先問')
    expect(output).toContain('毋臆')
  })

  test('compresses only text blocks', () => {
    const blocks = [
      { type: 'text', text: 'Do not verify before use.' },
      { type: 'image', source: 'x' },
    ] as const

    const output = compressTextBlocks([...blocks], 'full')

    expect(output[0]).toEqual({
      type: 'text',
      text: 'no prove pre use.',
    })
    expect(output[1]).toEqual(blocks[1])
  })
})
