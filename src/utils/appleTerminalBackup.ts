import { stat } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { getGlobalConfig, saveGlobalConfig } from './config.js'
import { execFileNoThrow } from './execFileNoThrow.js'
import { logError } from './log.js'

export function markTerminalSetupInProgress(backupPath: string): void {
  saveGlobalConfig(current => ({
    ...current,
    appleTerminalSetupInProgress: true,
    appleTerminalBackupPath: backupPath,
  }))
}

export function markTerminalSetupComplete(): void {
  saveGlobalConfig(current => ({
    ...current,
    appleTerminalSetupInProgress: false,
  }))
}

export function getTerminalRecoveryInfo(): {
  inProgress: boolean
  backupPath: string | null
} {
  const config = getGlobalConfig()
  return {
    inProgress: config.appleTerminalSetupInProgress ?? false,
    backupPath: config.appleTerminalBackupPath || null,
  }
}

export function getTerminalPlistPath(): string {
  return join(homedir(), 'Library', 'Preferences', 'com.apple.Terminal.plist')
}

function getNewBackupPath(): string {
  return join(
    homedir(),
    'Library',
    'Preferences',
    `com.apple.Terminal.tersa-backup-${Date.now()}.plist`,
  )
}

export async function backupTerminalPreferences(): Promise<string | null> {
  const terminalPlistPath = getTerminalPlistPath()
  const backupPath = getNewBackupPath()

  try {
    await stat(terminalPlistPath)
    const { code } = await execFileNoThrow('defaults', [
      'export',
      'com.apple.Terminal',
      backupPath,
    ])
    if (code !== 0) return null

    await stat(backupPath)
    markTerminalSetupInProgress(backupPath)
    return backupPath
  } catch (error) {
    logError(error)
    return null
  }
}

type RestoreResult =
  | {
      status: 'restored' | 'no_backup'
      backupPath?: string
    }
  | {
      status: 'failed'
      backupPath: string
    }

async function restoreBackupPath(backupPath: string): Promise<RestoreResult> {
  try {
    await stat(backupPath)
  } catch {
    return { status: 'no_backup' }
  }

  try {
    const { code } = await execFileNoThrow('defaults', [
      'import',
      'com.apple.Terminal',
      backupPath,
    ])
    if (code !== 0) return { status: 'failed', backupPath }

    await execFileNoThrow('killall', ['cfprefsd'])
    markTerminalSetupComplete()
    return { status: 'restored', backupPath }
  } catch (restoreError) {
    logError(
      new Error(
        `Failed to restore Terminal.app settings with: ${restoreError}`,
      ),
    )
    return { status: 'failed', backupPath }
  }
}

export async function restoreTerminalPreferencesBackup(): Promise<RestoreResult> {
  const { backupPath } = getTerminalRecoveryInfo()
  if (!backupPath) return { status: 'no_backup' }
  return restoreBackupPath(backupPath)
}

export async function checkAndRestoreTerminalBackup(): Promise<RestoreResult> {
  const { inProgress, backupPath } = getTerminalRecoveryInfo()
  if (!inProgress || !backupPath) {
    if (inProgress) markTerminalSetupComplete()
    return { status: 'no_backup' }
  }

  const result = await restoreBackupPath(backupPath)
  if (result.status === 'no_backup') markTerminalSetupComplete()
  return result
}
