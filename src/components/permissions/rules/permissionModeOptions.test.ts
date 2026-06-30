import { describe, expect, test } from 'bun:test'
import { getEmptyToolPermissionContext } from '../../../Tool.js'
import {
  getPermissionModeOptions,
  isElevatedPermissionMode,
  isManageablePermissionMode,
} from './permissionModeOptions.js'

describe('permissionModeOptions', () => {
  test('separates standard and elevated modes with explicit text labels', () => {
    const options = getPermissionModeOptions({
      ...getEmptyToolPermissionContext(),
      isBypassPermissionsModeAvailable: false,
    })

    expect(options.map(option => option.value)).toEqual([
      '__standard_modes',
      'default',
      'acceptEdits',
      'plan',
      '__elevated_modes',
      'bypassPermissions',
      'fullAccess',
    ])
    expect(options.find(option => option.value === '__standard_modes')?.disabled).toBe(
      true,
    )
    expect(options.find(option => option.value === '__elevated_modes')?.disabled).toBe(
      true,
    )
    expect(
      String(options.find(option => option.value === 'bypassPermissions')?.label),
    ).toContain('[ELEVATED]')
    expect(
      options.find(option => option.value === 'fullAccess')?.description,
    ).toContain('HIGHEST RISK')
  })

  test('keeps dangerous modes visible before session unlock', () => {
    const options = getPermissionModeOptions({
      ...getEmptyToolPermissionContext(),
      isBypassPermissionsModeAvailable: false,
    })

    expect(options.map(option => option.value)).toContain('bypassPermissions')
    expect(options.map(option => option.value)).toContain('fullAccess')
  })

  test('keeps the current dangerous mode visible and marked current', () => {
    const options = getPermissionModeOptions({
      ...getEmptyToolPermissionContext(),
      mode: 'fullAccess',
      isBypassPermissionsModeAvailable: false,
    })

    expect(options.find(option => option.value === 'fullAccess')?.label).toBe(
      '[ELEVATED] Full Access (current)',
    )
  })

  test('distinguishes selectable modes from disabled group headers', () => {
    expect(isManageablePermissionMode('default')).toBe(true)
    expect(isManageablePermissionMode('__standard_modes')).toBe(false)
    expect(isManageablePermissionMode('__elevated_modes')).toBe(false)
    expect(isElevatedPermissionMode('bypassPermissions')).toBe(true)
    expect(isElevatedPermissionMode('fullAccess')).toBe(true)
    expect(isElevatedPermissionMode('default')).toBe(false)
  })
})
