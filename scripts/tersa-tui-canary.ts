import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

type ScreenSnapshot = {
  text: string
  lines: string[]
}

type StableScreenResult = {
  ok: boolean
  errors: string[]
}

const FORBIDDEN_SCREEN_STRINGS = ['openclaude', 'browser connector']

function collapseWhitespace(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

export function normalizeScreenSnapshot(raw: string): ScreenSnapshot {
  const stripped = stripVTControlCharacters(raw)
    .replace(/\u001bc/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = stripped
    .split('\n')
    .map(line => collapseWhitespace(line))
    .filter(Boolean)

  return {
    text: lines.join('\n'),
    lines,
  }
}

export function assertStableScreen(
  snapshot: ScreenSnapshot,
  options: { width: number },
): StableScreenResult {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const line of snapshot.lines) {
    if (seen.has(line)) {
      errors.push(`duplicate row: ${line}`)
      break
    }
    seen.add(line)
    if (line.length > options.width) {
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

  return { ok: errors.length === 0, errors }
}

async function sleep(ms: number): Promise<void> {
  await Bun.sleep(ms)
}

async function terminateProcess(child: ReturnType<typeof spawn>): Promise<void> {
  child.kill('SIGTERM')
  const exited = await Promise.race([
    once(child, 'exit').then(() => true),
    sleep(1500).then(() => false),
  ])
  if (exited) {
    return
  }

  child.kill('SIGKILL')
  await Promise.race([
    once(child, 'exit').then(() => true),
    sleep(1500).then(() => false),
  ])
}

async function runCanary(binary: string, startupOnly: boolean): Promise<void> {
  const quotedBinary = binary.includes(' ') ? binary : JSON.stringify(binary)
  const command = binary.includes('--effort')
    ? quotedBinary
    : `${quotedBinary} --model gpt-5.4-mini --effort high`

  const child = spawn('/usr/bin/script', ['-q', '/dev/null', 'bash', '-lc', command], {
    env: {
      ...process.env,
      CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI ?? '1',
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? 'https://opengateway.gitlawb.com/v1',
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
      TERSA_TUI_CANARY: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', chunk => {
    output += chunk.toString()
  })
  child.stderr.on('data', chunk => {
    output += chunk.toString()
  })

  const send = async (chars: string, wait = 350) => {
    child.stdin.write(chars)
    await sleep(wait)
  }

  await sleep(1200)
  const startupResult = assertStableScreen(
    normalizeScreenSnapshot(output),
    { width: 120 },
  )
  if (!startupResult.ok) {
    throw new Error(startupResult.errors.join('\n'))
  }

  if (!startupOnly) {
    await send('/help\r', 650)
    await send('\u001b', 300)
    await send('/modes\r', 650)
    await send(' \u001b[B\u001b[C\r', 500)
    await send('/statusline\r', 650)
    await send(' \u001b[B \r', 500)
    await send('/permissions\r', 650)
    await send('\u001b', 300)
    await send('/status\r', 700)
    await send('\u001b', 300)
  }

  await terminateProcess(child)

  const finalResult = assertStableScreen(
    normalizeScreenSnapshot(output),
    { width: 120 },
  )
  if (!finalResult.ok) {
    throw new Error(finalResult.errors.join('\n'))
  }
}

if (import.meta.main) {
  let binary = 'node dist/cli.mjs'
  let startupOnly = false

  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index]
    if (arg === '--binary') {
      binary = process.argv[index + 1] ?? binary
      index += 1
      continue
    }
    if (arg === '--startup-only') {
      startupOnly = true
    }
  }

  const resolvedBinary =
    binary === 'tersa' || binary.startsWith('/')
      ? binary
      : resolve(process.cwd(), binary)

  await runCanary(resolvedBinary, startupOnly)
  console.log('PASS: tersa interactive canary')
}
