import { describe, expect, test } from 'bun:test'
import {
  formatTerminalSetupPreview,
  getTerminalSetupPlan,
} from './terminalSetup.js'

describe('terminal setup preview', () => {
  test('shows the exact Apple Terminal changes before applying them', () => {
    const plan = getTerminalSetupPlan('Apple_Terminal')
    expect(plan).not.toBeNull()

    const preview = formatTerminalSetupPreview(plan!)
    expect(preview).toContain('Terminal setup preview · Apple Terminal')
    expect(preview).toContain('Enable Use Option as Meta key')
    expect(preview).toContain('Disable the audio bell')
    expect(preview).toContain('timestamped Tersa backup')
    expect(preview).toContain('No settings have been changed.')
    expect(preview).toContain('/terminal-setup apply')
    expect(preview).toContain('/terminal-setup undo')
  })

  test('describes file-based terminal changes without claiming automatic undo', () => {
    const plan = getTerminalSetupPlan('vscode')
    expect(plan).not.toBeNull()
    expect(plan?.supportsUndo).toBe(false)

    const preview = formatTerminalSetupPreview(plan!)
    expect(preview).toContain('VSCode user keybindings.json')
    expect(preview).toContain('Copy the existing keybindings file')
    expect(preview).not.toContain('/terminal-setup undo')
  })

  test('returns no plan for unsupported or native-protocol terminals', () => {
    expect(getTerminalSetupPlan('ghostty')).toBeNull()
    expect(getTerminalSetupPlan('unknown')).toBeNull()
    expect(getTerminalSetupPlan(null)).toBeNull()
  })
})
