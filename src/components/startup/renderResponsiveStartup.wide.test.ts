import { describe, expect, test } from 'bun:test'
import { stripVTControlCharacters as stripAnsi } from 'node:util'
import { renderResponsiveStartup } from './renderResponsiveStartup.js'

const palette = {
  accent: [110, 214, 255] as const,
  cream: [228, 238, 248] as const,
  dim: [165, 186, 214] as const,
  border: [102, 150, 206] as const,
  gradient: [
    [112, 220, 255] as const,
    [47, 102, 182] as const,
  ],
}

const provider = {
  name: 'OpenAI',
  model: 'codexplan',
  baseUrl: 'https://chatgpt.com/backend-api/codex',
  isLocal: false,
}

const caveRows = [
  ['Mode', 'off'],
  ['Tool', 'off'],
  ['Struct', 'off'],
  ['Dedup', 'off'],
  ['History', 'off'],
  ['RTK', 'off'],
  ['Repo', 'off'],
  ['Memory', 'off'],
  ['Skill', 'off'],
  ['ML', 'off'],
  ['Sidecar', 'off'],
] as const

describe('renderResponsiveStartup wide layout', () => {
  test('restores the large Tersa logo and both status panels at 120 columns', () => {
    const lines = renderResponsiveStartup({
      columns: 120,
      rows: 34,
      version: '0.16.3',
      provider,
      caveRows,
      palette,
      paintLine: text => text,
    }).map(stripAnsi)

    const output = lines.join('\n')
    expect(output).toContain('████████╗███████╗██████╗ ███████╗ █████╗')
    expect(output).toContain('Provider')
    expect(output).toContain('Model')
    expect(output).toContain('Endpoint')
    expect(output).toContain('Mode')
    expect(output).toContain('Sidecar')
    expect(output).toContain('/help to begin')
    expect(Math.max(...lines.map(line => line.length))).toBeLessThanOrEqual(120)
  })

  test('preserves the existing compact renderer below 120 columns', () => {
    const output = renderResponsiveStartup({
      columns: 80,
      rows: 34,
      version: '0.16.3',
      provider,
      caveRows,
      palette,
      paintLine: text => text,
    })
      .map(stripAnsi)
      .join('\n')

    expect(output).toContain('  TERSA')
    expect(output).not.toContain('████████╗')
    expect(output).not.toContain('Endpoint')
    expect(output).not.toContain('Sidecar')
  })
})
