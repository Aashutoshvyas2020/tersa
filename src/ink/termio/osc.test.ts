import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../../test/sharedMutationLock.js'

const originalEnv = { ...process.env }
const originalPlatform = process.platform
const mockedClipboardPath = join(tmpdir(), 'tersa-clipboard.txt')
const CLIPBOARD_TEST_DEPS_KEY = Symbol.for('tersa.clipboardTestDeps')

type ExecCall = [
  command: string,
  args?: readonly string[],
  options?: Record<string, unknown>,
]

let execFileNoThrowCalls: ExecCall[] = []

async function recordExecFileNoThrow(
  command: string,
  args?: readonly string[],
  options?: Record<string, unknown>,
): Promise<{ code: number; stdout: string; stderr: string }> {
  execFileNoThrowCalls.push([command, args, options])
  return { code: 0, stdout: '', stderr: '' }
}

async function importFreshOscModule() {
  const module = await import(`./osc.ts?ts=${Date.now()}-${Math.random()}`)
  module.__setClipboardTestDeps({
    execFileNoThrow: recordExecFileNoThrow,
    generateTempFilePath: () => mockedClipboardPath,
    unlink: async () => {},
    writeFile: async () => {},
  })
  return module
}

describe('Windows clipboard fallback', () => {
  beforeEach(async () => {
    await acquireSharedMutationLock('ink/termio/osc.test.ts')
    execFileNoThrowCalls = []
    process.env = { ...originalEnv }
    delete process.env['SSH_CONNECTION']
    delete process.env['TMUX']
    Object.defineProperty(process, 'platform', { value: 'win32' })
  })

  afterEach(() => {
    try {
      process.env = { ...originalEnv }
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      delete (globalThis as Record<symbol, unknown>)[CLIPBOARD_TEST_DEPS_KEY]
    } finally {
      releaseSharedMutationLock()
    }
  })

  test('uses PowerShell instead of clip.exe for local Windows copy', async () => {
    const { _buildWindowsClipboardCommand } = await importFreshOscModule()

    const command = _buildWindowsClipboardCommand(mockedClipboardPath, 2000)

    expect(command.command).toBe('powershell')
    expect(command.command).not.toBe('clip')
  })

  test('passes Windows clipboard text through a UTF-8 temp file instead of stdin', async () => {
    const { _buildWindowsClipboardCommand } = await importFreshOscModule()

    const command = _buildWindowsClipboardCommand(mockedClipboardPath, 2000)

    expect(command.options).toMatchObject({
      stdin: 'ignore',
    })
    expect(command.options).not.toMatchObject({ input: 'Привет мир' })
    expect(command.options).not.toMatchObject({
      env: expect.objectContaining({
        TERSA_CLIPBOARD_TEXT_B64: expect.any(String),
      }),
    })
    expect(command.args).toContain(
      `$text = [System.IO.File]::ReadAllText('${mockedClipboardPath.replace(/'/g, "''")}', [System.Text.Encoding]::UTF8); Set-Clipboard -Value $text`,
    )
  })
})

describe('clipboard path behavior remains stable', () => {
  beforeEach(async () => {
    await acquireSharedMutationLock('ink/termio/osc.test.ts')
    execFileNoThrowCalls = []
    process.env = { ...originalEnv }
    delete process.env['SSH_CONNECTION']
    delete process.env['TMUX']
  })

  afterEach(() => {
    try {
      process.env = { ...originalEnv }
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      delete (globalThis as Record<symbol, unknown>)[CLIPBOARD_TEST_DEPS_KEY]
    } finally {
      releaseSharedMutationLock()
    }
  })

  test('getClipboardPath stays native on local macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    const { getClipboardPath } = await importFreshOscModule()

    expect(getClipboardPath()).toBe('native')
  })

  test('getClipboardPath stays tmux-buffer when TMUX is set', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env['TMUX'] = '/tmp/tmux-1000/default,123,0'
    const { getClipboardPath } = await importFreshOscModule()

    expect(getClipboardPath()).toBe('tmux-buffer')
  })

  test('Windows clipboard fallback is skipped over SSH', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    process.env['SSH_CONNECTION'] = '1 2 3 4'
    const { setClipboard } = await importFreshOscModule()

    Object.defineProperty(process, 'platform', { value: 'win32' })
    await setClipboard('Привет мир')

    expect(execFileNoThrowCalls.some(([cmd]) => cmd === 'powershell')).toBe(
      false,
    )
  })

})
