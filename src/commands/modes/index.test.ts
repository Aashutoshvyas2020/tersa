import { describe, expect, test } from 'bun:test'
import modes from './index.js'
import { toggleModeSetting } from './modes.js'

describe('/modes command', () => {
  test('registers as local-jsx command', () => {
    expect(modes.name).toBe('modes')
    expect(modes.type).toBe('local-jsx')
    expect(modes.description).toContain('modes')
  })

  test('toggles built-in modes without dropping intensity', () => {
    expect(toggleModeSetting({}, 'superpowers').superpowers).toEqual({
      enabled: true,
      intensity: 'full',
    })

    expect(
      toggleModeSetting(
        { superpowers: { enabled: true, intensity: 'lite' } },
        'superpowers',
    ).superpowers,
    ).toEqual({
      enabled: false,
      intensity: 'lite',
    })

    expect(toggleModeSetting({}, 'efficiency').efficiency).toEqual({
      enabled: true,
      intensity: 'full',
    })
  })
})
