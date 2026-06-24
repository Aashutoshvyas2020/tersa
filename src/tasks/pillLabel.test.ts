import { describe, expect, test } from 'bun:test'
import { getPillLabel } from './pillLabel.js'

describe('background task pill label', () => {
  test('uses neutral task wording for local agents', () => {
    expect(
      getPillLabel([
        {
          id: 'agent-1',
          type: 'local_agent',
          status: 'running',
        } as any,
      ]),
    ).toBe('1 task')

    expect(
      getPillLabel([
        {
          id: 'agent-1',
          type: 'local_agent',
          status: 'running',
        } as any,
        {
          id: 'agent-2',
          type: 'local_agent',
          status: 'running',
        } as any,
      ]),
    ).toBe('2 tasks')
  })
})
