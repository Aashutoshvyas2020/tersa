import { describe, expect, test } from 'bun:test'

import {
  buildPackInstallVerificationPlan,
  validatePackFilename,
} from './tersa-package-verify.ts'

describe('tersa package verification', () => {
  test('builds the expected pack verification command order', () => {
    const plan = buildPackInstallVerificationPlan('0.16.1')

    expect(plan).toEqual([
      'bun run verify:tersa:release',
      'npm pack --dry-run',
      'npm pack',
      'npm install -g ./tersa-0.16.1.tgz',
      'tersa --version',
      'tersa --help',
      'bun run test:tersa:interactive -- --binary tersa',
    ])
  })

  test('accepts tersa tarballs and rejects mismatched package names', () => {
    expect(validatePackFilename('tersa-0.16.1.tgz').ok).toBe(true)
    expect(validatePackFilename('@gitlawb-tersa-0.16.1.tgz').ok).toBe(false)
  })
})
