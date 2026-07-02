import { describe, expect, test } from 'bun:test'

import {
  buildNpmDryRunVerificationPlan,
  buildPackInstallVerificationPlan,
  buildPlatformSmokeVerificationPlan,
  findMissingPackedFiles,
  findPackedForbiddenFiles,
  parsePackJsonOutput,
  resolveInstalledBin,
  validatePackFilename,
} from './tersa-package-verify.ts'

describe('tersa package verification', () => {
  test('builds the expected pack verification command order', () => {
    const plan = buildPackInstallVerificationPlan('0.16.1')

    expect(plan).toEqual([
      'bun run verify:tersa:release',
      'npm pack --dry-run --json',
      'npm pack',
      'npm install -g ./tersa-cli-0.16.1.tgz',
      'tersa --version',
      'tersa --help',
      'bun run scripts/tersa-tui-canary.ts --binary tersa',
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
      'bun run scripts/tersa-tui-canary.ts --binary tersa',
    ])
  })

  test('builds the cross-platform installed package smoke order', () => {
    expect(buildPlatformSmokeVerificationPlan()).toEqual([
      'bun run build',
      'npm pack --dry-run --json',
      'npm pack --json',
      'npm install -g ./tersa-cli-<version>.tgz',
      'tersa --version',
      'tersa --help',
    ])
  })

  test('resolves the installed executable for Windows and POSIX', () => {
    expect(resolveInstalledBin('/tmp/prefix', 'win32')).toEndWith('tersa.cmd')
    expect(resolveInstalledBin('/tmp/prefix', 'darwin')).toEndWith('bin/tersa')
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

  test('detects missing required SDK declaration files', () => {
    const missing = findMissingPackedFiles([
      {
        filename: 'tersa-cli-0.16.1.tgz',
        files: [{ path: 'src/entrypoints/sdk.d.ts' }],
      },
    ], [
      'src/entrypoints/sdk.d.ts',
      'src/entrypoints/sdk/coreTypes.generated.ts',
    ])

    expect(missing).toEqual(['src/entrypoints/sdk/coreTypes.generated.ts'])
  })
})
