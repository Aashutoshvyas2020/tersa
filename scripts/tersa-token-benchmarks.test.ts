import { describe, expect, test } from 'bun:test'

import {
  evaluateTokenBenchmarkRelease,
  formatTokenBenchmarkReport,
  runTokenBenchmarks,
} from './tersa-token-benchmarks.ts'

describe('tersa token benchmarks', () => {
  test('fixtures show meaningful reductions', () => {
    const results = runTokenBenchmarks()
    const byName = new Map(results.map(result => [result.name, result]))

    expect(byName.get('bash-log-budget')?.savedTokens).toBeGreaterThan(0)
    expect(byName.get('bash-log-budget')?.detail).toBe('budget')

    expect(byName.get('read-budget')?.savedTokens).toBeGreaterThan(0)
    expect(byName.get('bash-structured-json')?.savedTokens).toBeGreaterThan(0)
    expect(byName.get('bash-structured-json')?.detail).toBe('json')
    expect(byName.get('tool-history-compression')?.savedTokens).toBeGreaterThan(0)
    expect(byName.get('skill-prompt-compression')?.detail).toBe(
      'real internal prompt compression',
    )
    expect(byName.get('ml-sidecar-compression')?.savedTokens).toBeGreaterThan(0)
    expect(byName.get('ml-sidecar-compression')?.detail).toContain('ml')
  })

  test('report formatter emits a markdown table', () => {
    const report = formatTokenBenchmarkReport(runTokenBenchmarks())

    expect(report).toContain('name | before | after | saved | reduction')
    expect(report).toContain('bash-log-budget')
    expect(report).toContain('tool-history-compression')
    expect(report).toContain('ml-sidecar-compression')
    expect(report).toContain('threshold')
    expect(report).toContain('pass')
  })

  test('release evaluation fails when a benchmark misses its threshold', () => {
    const evaluation = evaluateTokenBenchmarkRelease([
      {
        name: 'bash-log-budget',
        beforeTokens: 1_000,
        afterTokens: 950,
        savedTokens: 50,
        reductionRatio: 0.05,
        changed: true,
        detail: 'budget',
      },
    ])

    expect(evaluation.ok).toBe(false)
    expect(evaluation.failures[0]).toContain('bash-log-budget')
    expect(evaluation.failures[0]).toContain('threshold')
  })
})
