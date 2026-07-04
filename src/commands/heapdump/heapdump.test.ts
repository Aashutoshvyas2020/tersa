import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { formatHeapDumpOutput } from './heapdump.js'

describe('heapdump output formatting', () => {
  test('shows the destination once and labels both generated files', () => {
    const desktop = join(homedir(), 'Desktop')
    const output = formatHeapDumpOutput(
      join(desktop, 'audit.heapsnapshot'),
      join(desktop, 'audit-diagnostics.json'),
    )

    expect(output).toBe(
      'Heap dump written to ~/Desktop\n' +
        'Snapshot: audit.heapsnapshot\n' +
        'Diagnostics: audit-diagnostics.json',
    )
  })
})
