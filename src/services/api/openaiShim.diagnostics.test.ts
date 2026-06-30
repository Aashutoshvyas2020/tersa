import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../../test/sharedMutationLock.js'
import * as actualDebug from '../../utils/debug.js'

const originalFetch = globalThis.fetch
const originalEnv = {
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
}

type DebugLogOptions = Parameters<typeof actualDebug.logForDebugging>[1]
type ShimClient = {
  beta: {
    messages: {
      create: (params: Record<string, unknown>) => Promise<unknown>
    }
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

function createDebugSpy() {
  return mock((_message: string, _options?: DebugLogOptions) => {})
}

function mockDebugModule(debugSpy: ReturnType<typeof createDebugSpy>): void {
  mock.module('../../utils/debug.js', () => ({
    ...actualDebug,
    logForDebugging: debugSpy,
  }))
}

async function createTestClient(): Promise<ShimClient> {
  const nonce = `${Date.now()}-${Math.random()}`
  const { createOpenAIShimClient } = await import(`./openaiShim.ts?ts=${nonce}`)
  return createOpenAIShimClient({}) as ShimClient
}

function setFetchImplementation(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = Object.assign(implementation, {
    preconnect: originalFetch.preconnect,
  })
}

function successfulResponse(): Response {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-1',
      model: 'qwen2.5-coder:7b',
      choices: [
        {
          message: { role: 'assistant', content: 'ok' },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 2,
        total_tokens: 7,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function findLog(
  debugSpy: ReturnType<typeof createDebugSpy>,
  text: string,
) {
  return debugSpy.mock.calls.find(([message]) => message.includes(text))
}

beforeEach(async () => {
  await acquireSharedMutationLock('openaiShim.diagnostics.test.ts')
})

afterEach(() => {
  try {
    globalThis.fetch = originalFetch
    restoreEnv('OPENAI_BASE_URL', originalEnv.OPENAI_BASE_URL)
    restoreEnv('OPENAI_API_KEY', originalEnv.OPENAI_API_KEY)
    restoreEnv('OPENAI_MODEL', originalEnv.OPENAI_MODEL)
    mock.restore()
  } finally {
    releaseSharedMutationLock()
  }
})

test('logs classified transport diagnostics with category and code', async () => {
  const debugSpy = createDebugSpy()
  mockDebugModule(debugSpy)
  process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1'
  process.env.OPENAI_API_KEY = 'ollama'

  const transportError = Object.assign(new TypeError('fetch failed'), {
    code: 'ECONNREFUSED',
  })
  setFetchImplementation(async () => {
    throw transportError
  })

  const client = await createTestClient()
  await expect(
    client.beta.messages.create({
      model: 'qwen2.5-coder:7b',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 64,
      stream: false,
    }),
  ).rejects.toThrow('openai_category=connection_refused')

  const transportLog = findLog(debugSpy, 'transport failure')
  expect(transportLog).toBeDefined()
  expect(transportLog?.[0]).toContain('category=connection_refused')
  expect(transportLog?.[0]).toContain('code=ECONNREFUSED')
  expect(transportLog?.[1]).toEqual({ level: 'warn' })
})

test('redacts credentials in transport diagnostic URL logs', async () => {
  const debugSpy = createDebugSpy()
  mockDebugModule(debugSpy)
  process.env.OPENAI_BASE_URL = 'http://user:supersecret@localhost:11434/v1'
  process.env.OPENAI_API_KEY = 'supersecret'

  setFetchImplementation(async () => {
    throw Object.assign(new TypeError('fetch failed'), {
      code: 'ECONNREFUSED',
    })
  })

  const client = await createTestClient()
  await expect(
    client.beta.messages.create({
      model: 'qwen2.5-coder:7b',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 64,
      stream: false,
    }),
  ).rejects.toThrow('openai_category=connection_refused')

  const logLine = findLog(debugSpy, 'transport failure')?.[0] ?? ''
  expect(logLine).toContain(
    'url=http://redacted:redacted@localhost:11434/v1/chat/completions',
  )
  expect(logLine).not.toContain('user:supersecret')
  expect(logLine).not.toContain('supersecret@')
})

test('logs self-heal localhost fallback with redacted from/to URLs', async () => {
  const debugSpy = createDebugSpy()
  mockDebugModule(debugSpy)
  process.env.OPENAI_BASE_URL = 'http://user:supersecret@localhost:11434/v1'
  process.env.OPENAI_API_KEY = 'supersecret'

  setFetchImplementation(async input => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.includes('localhost')) {
      throw Object.assign(new TypeError('fetch failed'), { code: 'ENOTFOUND' })
    }
    return successfulResponse()
  })

  const client = await createTestClient()
  await expect(
    client.beta.messages.create({
      model: 'qwen2.5-coder:7b',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 64,
      stream: false,
    }),
  ).resolves.toBeDefined()

  const logLine =
    findLog(debugSpy, 'self-heal retry reason=localhost_resolution_failed')?.[0] ??
    ''
  expect(logLine).toContain(
    'from=http://redacted:redacted@localhost:11434/v1/chat/completions',
  )
  expect(logLine).toContain(
    'to=http://redacted:redacted@127.0.0.1:11434/v1/chat/completions',
  )
  expect(logLine).not.toContain('supersecret')
})

test('logs self-heal toolless retry for local tool-call incompatibility', async () => {
  const debugSpy = createDebugSpy()
  mockDebugModule(debugSpy)
  process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1'
  process.env.OPENAI_API_KEY = 'ollama'

  let callCount = 0
  setFetchImplementation(async () => {
    callCount += 1
    if (callCount === 1) {
      return new Response('tool_calls are not supported', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    return successfulResponse()
  })

  const client = await createTestClient()
  await expect(
    client.beta.messages.create({
      model: 'qwen2.5-coder:7b',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [
        {
          name: 'Read',
          description: 'Read file',
          input_schema: {
            type: 'object',
            properties: { filePath: { type: 'string' } },
            required: ['filePath'],
          },
        },
      ],
      max_tokens: 64,
      stream: false,
    }),
  ).resolves.toBeDefined()

  const fallbackLog = findLog(
    debugSpy,
    'self-heal retry reason=tool_call_incompatible mode=toolless',
  )
  expect(fallbackLog).toBeDefined()
  expect(fallbackLog?.[1]).toEqual({ level: 'warn' })
})
