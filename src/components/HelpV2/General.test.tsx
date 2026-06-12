import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import React from 'react'
import { renderToString } from '../../utils/staticRender.js'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../../test/sharedMutationLock.js'

beforeEach(async () => {
  await acquireSharedMutationLock('components/HelpV2/General.test.tsx')
  mock.module('../../utils/tersaStatus.js', () => ({
    getTersaOptimizationStatusRows: () => [
      ['Mode', 'full'],
      ['Tool', 'on'],
      ['Struct', 'on'],
      ['Dedup', 'on'],
      ['History', 'on'],
      ['RTK', 'on'],
      ['Repo', 'on'],
      ['Memory', 'on'],
      ['Skill', 'full'],
      ['ML', 'off'],
      ['Sidecar', 'off'],
      ['Profile', 'minimal'],
      ['Karpathy', 'full'],
      ['Super', 'off'],
      ['GSD', 'off'],
      ['Designer', 'off'],
    ],
  }))
})

afterEach(() => {
  try {
    mock.restore()
  } finally {
    releaseSharedMutationLock()
  }
})

describe('HelpV2 General tab', () => {
  test('explains optimize rows and mode presets', async () => {
    const { General } = await import('./General.js?help-general')

    const output = await renderToString(<General />, 120)

    expect(output).toContain('Shortcuts')
    expect(output).toContain('Optimize')
    expect(output).toContain('Mode    · full')
    expect(output).toContain('Tool    · on')
    expect(output).toContain('Global cave mode')
    expect(output).toContain('Compress tool output')
    expect(output).toContain('If the same file or range is read again unchanged')
    expect(output).toContain('Mode preset')
    expect(output).toContain('Karpathy')
    expect(output).toContain('Super')
    expect(output).toContain('GSD')
    expect(output).toContain('Designer')
  })
})
