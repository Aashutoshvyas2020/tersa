import { mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

type ScreenSnapshot = {
  text: string
  lines: string[]
}

type StableScreenResult = {
  ok: boolean
  errors: string[]
}

type ExpectStep = {
  send?: string
  expect: string
  regex?: boolean
}

const FORBIDDEN_SCREEN_STRINGS = [
  'openclaude',
  'browser connector',
  'codexplan',
  'gpt-5.5',
]
const HIDDEN_MARKER_PATTERN = /<tersa-canary:[0-9a-f]{4}>/i

function collapseWhitespace(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function compactText(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}

export function normalizeScreenSnapshot(raw: string): ScreenSnapshot {
  const stripped = stripVTControlCharacters(raw)
    .replace(/\u001bc/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = stripped
    .split('\n')
    .map(line => collapseWhitespace(line))
    .filter(
      line =>
        !line.startsWith('timeout { puts stderr') &&
        !line.startsWith('eof { puts stderr'),
    )
    .filter(Boolean)

  return {
    text: lines.join('\n'),
    lines,
  }
}

export function assertStableScreen(
  snapshot: ScreenSnapshot,
  options: { width: number; checkDuplicates?: boolean },
): StableScreenResult {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const line of snapshot.lines) {
    const decorativeOnly = /^[│╭╮╰╯─└┌┐┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═\s]+$/.test(line)
    const redrawFooter =
      line.length <= 3 ||
      /[█╗╔╝╚═]/.test(line) ||
      line.includes('?forshortcuts') ||
      line.includes('? for shortcuts') ||
      line.includes('/effort') ||
      line.includes('Staticling') ||
      line.startsWith('esc to interrupt') ||
      line.startsWith('❯ ')
    const duplicateKey = decorativeOnly || redrawFooter ? undefined : line
    if ((options.checkDuplicates ?? true) && duplicateKey && seen.has(duplicateKey)) {
      errors.push(`duplicate row: ${line}`)
      break
    }
    if (duplicateKey) seen.add(duplicateKey)
    if (!decorativeOnly && line.length > options.width) {
      errors.push(`wrapped row exceeds width ${options.width}: ${line}`)
      break
    }
  }

  const lower = snapshot.text.toLowerCase()
  for (const forbidden of FORBIDDEN_SCREEN_STRINGS) {
    if (lower.includes(forbidden)) {
      errors.push(`forbidden legacy branding: ${forbidden}`)
    }
  }
  if (HIDDEN_MARKER_PATTERN.test(snapshot.text)) {
    errors.push('hidden session canary marker leaked to screen')
  }

  return { ok: errors.length === 0, errors }
}

function assertNoLeaks(): void {
  const result = spawnSync(
    'pgrep',
    ['-f', 'tersa-tui-canary|node dist/cli.mjs|test:tersa:interactive|script -q'],
    { encoding: 'utf8' },
  )
  const pids = (result.stdout ?? '')
    .split('\n')
    .map(row => row.trim())
    .filter(Boolean)
    .filter(pid => pid !== String(process.pid))
  const rows = pids
    .map(pid => {
      const ps = spawnSync('ps', ['-p', pid, '-o', 'pid=,ppid=,command='], {
        encoding: 'utf8',
      })
      return { pid, row: (ps.stdout ?? '').trim() }
    })
    .filter(item => item.row)
    .filter(item => !item.row.includes('pgrep -f'))
    .filter(item => !item.row.includes('bun run scripts/tersa-tui-canary.ts'))
  if (rows.length > 0) {
    for (const { pid } of rows) {
      spawnSync('kill', [pid], { encoding: 'utf8' })
    }
    spawnSync('sleep', ['0.3'], { encoding: 'utf8' })
    const survivors = rows
      .map(({ pid }) => {
        const ps = spawnSync('ps', ['-p', pid, '-o', 'pid=,ppid=,command='], {
          encoding: 'utf8',
        })
        const row = (ps.stdout ?? '').trim()
        if (row) {
          spawnSync('kill', ['-9', pid], { encoding: 'utf8' })
          spawnSync('sleep', ['0.1'], { encoding: 'utf8' })
          const retry = spawnSync('ps', ['-p', pid, '-o', 'pid=,ppid=,command='], {
            encoding: 'utf8',
          })
          return (retry.stdout ?? '').trim()
        }
        return row
      })
      .filter(Boolean)
    if (survivors.length > 0) {
      throw new Error(`leaked Tersa child process:\n${survivors.join('\n')}`)
    }
  }
}

function shellCommandForBinary(binary: string): string {
  const trimmed = binary.trim()
  if (trimmed.includes(' ')) {
    return trimmed
  }
  return JSON.stringify(trimmed)
}

function createCanaryConfigDir(): string {
  return mkdtempSync(join(tmpdir(), 'tersa-tui-canary-'))
}

function expectLiteral(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function currentSnapshot(output: string): ScreenSnapshot {
  return normalizeScreenSnapshot(output)
}

function assertScreen(
  output: string,
  width: number,
  label: string,
  expected: string[],
  options: { checkDuplicates?: boolean } = {},
): void {
  const snapshot = currentSnapshot(output)
  const stable = assertStableScreen(snapshot, {
    width,
    checkDuplicates: options.checkDuplicates,
  })
  if (!stable.ok) {
    throw new Error(`${label} failed stability checks:\n${stable.errors.join('\n')}`)
  }
  const compactSnapshot = compactText(snapshot.text)
  for (const text of expected) {
    if (
      !snapshot.text.includes(text) &&
      !compactSnapshot.includes(compactText(text))
    ) {
      throw new Error(`${label} missing expected text: ${text}\n\n${snapshot.text}`)
    }
  }
}

async function runCanaryAtWidth(
  binary: string,
  startupOnly: boolean,
  width: number,
): Promise<void> {
  const configDir = createCanaryConfigDir()
  const baseCommand = shellCommandForBinary(binary)
  const command = `stty cols ${width} rows 34; ${baseCommand} --model gpt-5.4-mini --effort high`
  const steps = startupOnly
    ? [
        { expect: 'Tersa' },
        { expect: '[Gg]PT-5\\.4.*mini', regex: true },
      ] satisfies ExpectStep[]
    : [
        { expect: 'Tersa' },
        { expect: '[Gg]PT-5\\.4.*mini', regex: true },
        { send: '/model\\r', expect: 'Select' },
        { expect: 'gpt-5.4-mini' },
        { expect: 'High' },
        { send: '\\033', expect: 'Kept' },
        {
          send: 'normal tui canary prompt\\r',
          expect: 'normal-response',
          regex: true,
        },
        {
          send: 'drift miss one\\r',
          expect: 'drift-one.*response',
          regex: true,
        },
        {
          send: 'drift miss two\\r',
          expect: 'drift-two.*response',
          regex: true,
        },
        {
          send: 'drift miss three\\r',
          expect: 'Compact.*context',
          regex: true,
        },
        { send: '\\033\\[B\\r', expect: 'Tersa' },
        { send: 'drift miss four\\r', expect: 'drift-four.*response', regex: true },
        { send: 'drift miss five\\r', expect: 'drift-five.*response', regex: true },
        { send: 'drift miss six\\r', expect: 'drift-six.*response', regex: true },
        { expect: 'Compact.*context', regex: true },
        { send: '\\033\\[B\\033\\[B\\r', expect: 'Tersa' },
        { send: 'drift miss seven\\r', expect: 'drift-seven.*response', regex: true },
        { send: 'drift miss eight\\r', expect: 'drift-eight.*response', regex: true },
        { send: 'drift miss nine\\r', expect: 'drift-nine.*response', regex: true },
      ] satisfies ExpectStep[]
  const expectSteps = steps
    .map(step => {
      const send = 'send' in step ? `send "${step.send}"\nafter 1200\n` : ''
      const matcher = step.regex
        ? `-re {${step.expect}}`
        : `"${expectLiteral(step.expect)}"`
      return `${send}expect {
  ${matcher} {}
  timeout { puts stderr "timeout waiting for ${expectLiteral(step.expect)}"; exit 2 }
  eof { puts stderr "unexpected eof waiting for ${expectLiteral(step.expect)}"; exit 3 }
}
after 300`
    })
    .join('\n')
  const expectScript = `
set timeout 10
after 30000 { puts stderr "wall timeout waiting for PTY canary"; exit 2 }
proc shutdown {pid} {
  send "\\003"
  after 300
  send "\\003"
  after 300
  catch { exec pkill -TERM -P $pid }
  catch { exec kill -TERM $pid }
  after 300
  catch { exec pkill -KILL -P $pid }
  catch { exec kill -KILL $pid }
  catch { wait -nowait }
}
spawn -noecho bash -lc "$env(TERSA_TUI_CANARY_COMMAND)"
set child_pid [exp_pid]
${expectSteps}
shutdown $child_pid
exit 0
`

  try {
    const result = spawnSync('/usr/bin/expect', ['-c', expectScript], {
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: configDir,
        CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI ?? '1',
        OPENAI_BASE_URL: 'https://opengateway.gitlawb.com/v1',
        OPENAI_MODEL: 'gpt-5.4-mini',
        OPENAI_API_KEY: 'tersa-tui-canary',
        OPENGATEWAY_API_KEY: 'tersa-tui-canary',
        TERSA_TUI_CANARY: '1',
        TERSA_TUI_CANARY_PROVIDER: 'fixture',
        TERSA_TUI_CANARY_EFFORT: 'high',
        TERSA_TUI_CANARY_COMMAND: command,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        COLUMNS: String(width),
        LINES: '34',
      },
      encoding: 'utf8',
    })
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    if (result.status !== 0) {
      throw new Error(`PTY canary failed at width ${width}\n${output}`)
    }
    assertScreen(output, width, `startup ${width}`, ['Tersa', 'GPT-5.4 mini'], {
      checkDuplicates: false,
    })

    if (!startupOnly) {
      assertScreen(
        output,
        width,
        `/model ${width}`,
        ['GPT-5.4 mini', 'High effort'],
        { checkDuplicates: false },
      )
      assertScreen(output, width, `prompt ${width}`, [
        'TUI canary',
        'gpt-5.4-mini high',
      ], { checkDuplicates: false })
      assertScreen(
        output,
        width,
        `drift warning ${width}`,
        [
          'Session drift detected',
          'gpt-5.4-mini',
          'Compact context',
          'Ignore',
          "Don't warn again this session",
        ],
        { checkDuplicates: false },
      )
    }

    const finalResult = assertStableScreen(currentSnapshot(output), {
      width,
      checkDuplicates: false,
    })
    if (!finalResult.ok) {
      throw new Error(finalResult.errors.join('\n'))
    }
  } finally {
    rmSync(configDir, { recursive: true, force: true })
  }
}

async function runDialogCanaryAtWidth(
  binary: string,
  width: number,
  commandName: string,
  expectedText: string[],
): Promise<void> {
  const configDir = createCanaryConfigDir()
  const baseCommand = shellCommandForBinary(binary)
  const command = `stty cols ${width} rows 34; ${baseCommand} --model gpt-5.4-mini --effort high`
  const firstExpected = expectedText[0] ?? commandName
  const expectScript = `
set timeout 10
after 30000 { puts stderr "wall timeout waiting for ${expectLiteral(commandName)}"; exit 2 }
proc shutdown {pid} {
  send "\\003"
  after 300
  send "\\033"
  after 300
  send "\\003"
  after 300
  catch { exec pkill -TERM -P $pid }
  catch { exec kill -TERM $pid }
  after 300
  catch { exec pkill -KILL -P $pid }
  catch { exec kill -KILL $pid }
  catch { wait -nowait }
}
spawn -noecho bash -lc "$env(TERSA_TUI_CANARY_COMMAND)"
set child_pid [exp_pid]
expect {
  -re {[Gg]PT-5\.4.*mini} {}
  timeout { puts stderr "timeout waiting for startup"; exit 2 }
  eof { puts stderr "unexpected eof waiting for startup"; exit 3 }
}
send "${expectLiteral(commandName)}\\r"
after 1200
expect {
  "${expectLiteral(firstExpected)}" {}
  timeout { puts stderr "timeout waiting for ${expectLiteral(commandName)}"; exit 2 }
  eof { puts stderr "unexpected eof waiting for ${expectLiteral(commandName)}"; exit 3 }
}
shutdown $child_pid
exit 0
`

  try {
    const result = spawnSync('/usr/bin/expect', ['-c', expectScript], {
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: configDir,
        CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI ?? '1',
        OPENAI_BASE_URL: 'https://opengateway.gitlawb.com/v1',
        OPENAI_MODEL: 'gpt-5.4-mini',
        OPENAI_API_KEY: 'tersa-tui-canary',
        OPENGATEWAY_API_KEY: 'tersa-tui-canary',
        TERSA_TUI_CANARY: '1',
        TERSA_TUI_CANARY_PROVIDER: 'fixture',
        TERSA_TUI_CANARY_EFFORT: 'high',
        TERSA_TUI_CANARY_COMMAND: command,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        COLUMNS: String(width),
        LINES: '34',
      },
      encoding: 'utf8',
    })
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    if (result.status !== 0) {
      throw new Error(`PTY ${commandName} canary failed at width ${width}\n${output}`)
    }
    assertScreen(output, width, `${commandName} ${width}`, expectedText, {
      checkDuplicates: false,
    })
  } finally {
    rmSync(configDir, { recursive: true, force: true })
  }
}

async function runCanary(binary: string, startupOnly: boolean): Promise<void> {
  const widths = startupOnly ? [80] : [60, 80, 120]
  for (const width of widths) {
    await runCanaryAtWidth(binary, startupOnly, width)
    if (!startupOnly) {
      await runDialogCanaryAtWidth(binary, width, '/help', ['Optimize'])
      await runDialogCanaryAtWidth(binary, width, '/modes', ['Modes'])
      await runDialogCanaryAtWidth(binary, width, '/statusline', ['Status'])
      await runDialogCanaryAtWidth(binary, width, '/permissions', ['Permissions'])
      await runDialogCanaryAtWidth(binary, width, '/status', ['Session'])
    }
    assertNoLeaks()
  }
}

if (import.meta.main) {
  let binary = 'node dist/cli.mjs'
  let startupOnly = false

  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index]
    if (arg === '--binary') {
      const parts: string[] = []
      while (process.argv[index + 1] && !process.argv[index + 1]!.startsWith('--')) {
        parts.push(process.argv[index + 1]!)
        index += 1
      }
      binary = parts.join(' ') || binary
      continue
    }
    if (arg === '--startup-only') {
      startupOnly = true
    }
  }

  await runCanary(binary, startupOnly)
  console.log('PASS: tersa interactive canary')
}
