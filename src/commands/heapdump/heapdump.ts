import { basename, dirname } from 'node:path'

import { getDisplayPath } from '../../utils/file.js'
import { performHeapDump } from '../../utils/heapDumpService.js'

export function formatHeapDumpOutput(
  heapPath: string,
  diagPath: string,
): string {
  const directory = getDisplayPath(dirname(heapPath))
  return [
    `Heap dump written to ${directory}`,
    `Snapshot: ${basename(heapPath)}`,
    `Diagnostics: ${basename(diagPath)}`,
  ].join('\n')
}

export async function call(): Promise<{ type: 'text'; value: string }> {
  const result = await performHeapDump()

  if (!result.success) {
    return {
      type: 'text',
      value: `Failed to create heap dump: ${result.error}`,
    }
  }

  return {
    type: 'text',
    value: formatHeapDumpOutput(result.heapPath, result.diagPath),
  }
}
