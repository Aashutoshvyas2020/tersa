import { describe, expect, test } from 'bun:test'
import {
  getTersaModePromptSection,
  getTersaModesConfig,
} from './config.js'

describe('tersa modes config', () => {
  test('defaults to minimal with only karpathy enabled', () => {
    const config = getTersaModesConfig({})

    expect(config.profile).toBe('minimal')
    expect(config.modes.karpathy.enabled).toBe(true)
    expect(config.modes.superpowers.enabled).toBe(false)
    expect(config.modes.gsd.enabled).toBe(false)
    expect(config.modes.designer.enabled).toBe(false)
    expect(config.modes.efficiency.enabled).toBe(false)
  })

  test('respects explicit settings overrides', () => {
    const config = getTersaModesConfig({
      profile: 'standard',
      gsd: { enabled: true, intensity: 'lite' },
      superpowers: { enabled: false },
      designer: { enabled: false },
    })

    expect(config.profile).toBe('standard')
    expect(config.modes.karpathy.enabled).toBe(true)
    expect(config.modes.superpowers.enabled).toBe(false)
    expect(config.modes.gsd.intensity).toBe('lite')
    expect(config.modes.designer.enabled).toBe(false)
  })

  test('prompt section includes enabled modes only', () => {
    const prompt = getTersaModePromptSection({
      profile: 'minimal',
      superpowers: { enabled: false },
      gsd: { enabled: false },
      designer: { enabled: false },
    })

    expect(prompt).toContain('# Active modes')
    expect(prompt).toContain('Karpathy Mode:')
    expect(prompt).not.toContain('Superpowers Mode:')
    expect(prompt).not.toContain('GSD Mode:')
    expect(prompt).not.toContain('Designer Mode:')
    expect(prompt).not.toContain('Efficiency Mode:')
  })

  test('mode prompt supports wenyan intensities', () => {
    const prompt = getTersaModePromptSection({
      karpathy: { enabled: true, intensity: 'wenyan-full' },
      superpowers: { enabled: false },
      gsd: { enabled: false },
      designer: { enabled: false },
    })

    expect(prompt).toContain('Karpathy Mode:')
    expect(prompt).toContain('先明所假')
  })

  test('designer mode is present and off by default', () => {
    const config = getTersaModesConfig({})

    expect(config.modes.designer.label).toContain('Designer')
    expect(config.modes.designer.enabled).toBe(false)
  })

  test('efficiency mode is present, off by default, and promptable', () => {
    const config = getTersaModesConfig({})
    expect(config.modes.efficiency.label).toBe('Efficiency Mode')
    expect(config.modes.efficiency.enabled).toBe(false)

    const prompt = getTersaModePromptSection({
      efficiency: { enabled: true, intensity: 'ultra' },
      karpathy: { enabled: false },
    })
    expect(prompt).toContain('Efficiency Mode:')
    expect(prompt).toContain('Smallest correct patch')
  })
})
