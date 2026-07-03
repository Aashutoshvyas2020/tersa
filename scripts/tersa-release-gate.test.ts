import { describe, expect, test } from 'bun:test'

import {
  RELEASE_GATE_STEPS,
  buildReleaseGatePlan,
  validateReleaseSurfaceText,
} from './tersa-release-gate.ts'

describe('tersa release gate', () => {
  test('builds the expected gate tiers', () => {
    const plan = buildReleaseGatePlan()

    expect(plan.dev.commands).toEqual([
      'bun run build',
      'bun run smoke:tersa',
      'bun run test:tersa:focused',
    ])
    expect(plan.interactive.commands).toEqual([
      'bun run test:tersa:interactive',
    ])
    expect(plan.release.commands).toEqual([
      'bun run build',
      'bun run typecheck:production',
      'bun test tests/sdk/package-consumer-types.test.ts',
      'bun run smoke:tersa',
      'bun run doctor:runtime',
      'bun run verify:privacy',
      'bun run audit:branding:tersa',
      'bun run audit:release:tersa',
      'bun audit',
      'bun run benchmark:tokens:tersa',
      'bun run test:tersa',
      'bun run test:full',
      'bun run test:tersa:quarantined',
      'bun run test:tersa:interactive',
    ])
    expect(plan.release.commands).toEqual(RELEASE_GATE_STEPS)
  })

  test('detects forbidden legacy strings in user-facing text', () => {
    const legacyOpenProduct = ['Open', 'Claude'].join('')
    const result = validateReleaseSurfaceText(
      `Welcome to ${legacyOpenProduct}.\nUse the browser connector to continue.`,
    )

    expect(result.ok).toBe(false)
    expect(result.violations).toContain(legacyOpenProduct.toLowerCase())
    expect(result.violations).toContain('browser connector')
  })

  test('detects removed session drift warnings in user-facing text', () => {
    const message = ['Session', ' drift detected'].join('')
    const result = validateReleaseSurfaceText(message)

    expect(result.ok).toBe(false)
    expect(result.violations).toContain(message.toLowerCase())
  })
})
