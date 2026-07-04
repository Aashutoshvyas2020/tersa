import { describe, expect, test } from 'bun:test'
import { getPermissionModeIntro } from './PermissionModeTab.js'

describe('getPermissionModeIntro', () => {
  test('fits the narrow explanation on one content row', () => {
    const intro = getPermissionModeIntro(60)

    expect(intro.detail).toBe(
      'Standard modes are safe; elevated modes ask to confirm.',
    )
    expect(intro.detail.length).toBeLessThanOrEqual(56)
    expect(intro.compact).toBe(true)
  })

  test('preserves the detailed explanation at wider widths', () => {
    const intro = getPermissionModeIntro(80)

    expect(intro.detail).toContain('separate confirmation')
    expect(intro.compact).toBe(false)
  })
})
