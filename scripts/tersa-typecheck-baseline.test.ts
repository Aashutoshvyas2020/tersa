import { describe, expect, test } from 'bun:test'

import { extractTypeScriptErrorSignatures } from './tersa-typecheck-baseline.ts'

describe('tersa TypeScript baseline', () => {
  test('extracts stable file/position/error-code signatures', () => {
    expect(
      extractTypeScriptErrorSignatures(
        [
          'src/a.ts(1,2): error TS1234: first message',
          'src/a.ts(1,2): error TS1234: duplicate message',
          'note without error',
          'src/b.tsx(3,4): error TS5678: second message',
        ].join('\n'),
      ),
    ).toEqual([
      'src/a.ts(1,2): error TS1234',
      'src/b.tsx(3,4): error TS5678',
    ])
  })
})
