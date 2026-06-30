import { describe, expect, test } from 'bun:test'
import modes from './index.js'
import { toggleCaveModeSetting, toggleModeSetting } from './modes.js'

describe('/modes command', () => {
  test('registers as local-jsx command', () => {
    expect(modes.name).toBe('modes')
    expect(modes.type).toBe('local-jsx')
    expect(modes.description).toContain('modes')
  })

  test('toggles Cave Mode without losing its configured intensity', () => {
    expect(toggleCaveModeSetting({ enabled: true, intensity: 'light' })).toMatchObject({
      enabled: false,
      intensity: 'light',
    })
    expect(toggleCaveModeSetting({ enabled: false, intensity: 'off' })).toMatchObject({
      enabled: true,
      intensity: 'full',
    })
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
