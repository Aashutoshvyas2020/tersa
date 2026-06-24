import { describe, expect, test } from 'bun:test'

import {
  buildNpmDryRunVerificationPlan,
  buildPackInstallVerificationPlan,
  findPackedForbiddenFiles,
  parsePackJsonOutput,
  validatePackFilename,
} from './tersa-package-verify.ts'

describe('tersa package verification', () => {
  test('builds the expected pack verification command order', () => {
    const plan = buildPackInstallVerificationPlan('0.16.1')

    expect(plan).toEqual([
      'bun run verify:tersa:release',
      'npm pack --dry-run',
      'npm pack',
      'npm install -g ./tersa-cli-0.16.1.tgz',
      'tersa --version',
      'tersa --help',
      'bun run scripts/tersa-tui-canary.ts --startup-only --binary tersa',
    ])
  })

  test('builds the npm dry-run verification command order', () => {
    expect(buildNpmDryRunVerificationPlan()).toEqual([
      'bun run build',
      'npm pack --dry-run --json',
      'npm pack --json',
      'npm install -g ./tersa-cli-<version>.tgz',
      'tersa --version',
      'tersa --help',
      'bun run scripts/tersa-tui-canary.ts --startup-only --binary tersa',
    ])
  })

  test('accepts tersa tarballs and rejects mismatched package names', () => {
    expect(validatePackFilename('tersa-cli-0.16.1.tgz').ok).toBe(true)
    expect(validatePackFilename('tersa-0.16.1.tgz').ok).toBe(false)
  })

  test('parses npm pack json after prepack log noise', () => {
    const parsed = parsePackJsonOutput([
      '> tersa@0.16.1 prepack',
      '> npm run build',
      '',
      '[{"filename":"tersa-cli-0.16.1.tgz"}]',
    ].join('\n'))

    expect(parsed).toEqual([{ filename: 'tersa-cli-0.16.1.tgz' }])
  })

  test('detects forbidden packed files', () => {
    const forbidden = findPackedForbiddenFiles([
      {
        filename: 'tersa-cli-0.16.1.tgz',
        files: [
          { path: 'bin/import-specifier.mjs' },
          { path: 'bin/import-specifier.test.mjs' },
        ],
      },
    ], ['bin/import-specifier.test.mjs'])

    expect(forbidden).toEqual(['bin/import-specifier.test.mjs'])
  })
})
