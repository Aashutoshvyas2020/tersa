import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { BashToolInput } from '../../tools/BashTool/BashTool.js'
import type { RtkRewriteMetadata } from './types.js'
import { getCaveModeConfig } from './config.js'

const execFileAsync = promisify(execFile)
const DETECTION_TIMEOUT_MS = 1000
const REWRITE_TIMEOUT_MS = 250

type ExecFileImpl = (
  file: string,
  args: string[],
  options: { timeout: number; encoding: 'utf8' },
) => Promise<{ stdout: string; stderr: string }>

type RtkStatus = {
  available: boolean
}

let cachedStatusPromise: Promise<RtkStatus> | undefined
let execFileImpl = execFileAsync as ExecFileImpl

async function detectRtk(): Promise<RtkStatus> {
  try {
    await execFileImpl('rtk', ['--version'], {
      timeout: DETECTION_TIMEOUT_MS,
      encoding: 'utf8',
    })
    return { available: true }
  } catch {
    return { available: false }
  }
}

async function getRtkStatus(): Promise<RtkStatus> {
  cachedStatusPromise ??= detectRtk()
  return cachedStatusPromise
}

export function resetRtkStatusForTest(): void {
  cachedStatusPromise = undefined
  execFileImpl = execFileAsync
}

export function setRtkExecFileImplForTest(
  impl: ExecFileImpl | undefined,
): void {
  execFileImpl = impl ?? (execFileAsync as ExecFileImpl)
}

type BashLikeInput = BashToolInput & { command: string }

export async function maybeRewriteBashInputWithRtk<T extends BashLikeInput>(
  input: T,
): Promise<{ input: T; metadata: RtkRewriteMetadata }> {
  const config = getCaveModeConfig()
  if (!config.enabled || config.intensity !== 'full' || !config.rtkRewrite) {
    return {
      input,
      metadata: {
        available: false,
        attempted: false,
        changed: false,
      },
    }
  }

  if (input.command === 'rtk' || input.command.startsWith('rtk ')) {
    return {
      input,
      metadata: {
        available: true,
        attempted: false,
        changed: false,
      },
    }
  }

  const status = await getRtkStatus()
  if (!status.available) {
    return {
      input,
      metadata: {
        available: false,
        attempted: false,
        changed: false,
      },
    }
  }

  try {
    const { stdout } = await execFileImpl(
      'rtk',
      ['rewrite', input.command],
      {
        timeout: REWRITE_TIMEOUT_MS,
        encoding: 'utf8',
      },
    )
    const rewritten = stdout.trim()
    if (!rewritten || rewritten === input.command) {
      return {
        input,
        metadata: {
          available: true,
          attempted: true,
          changed: false,
        },
      }
    }
    return {
      input: {
        ...input,
        command: rewritten,
      },
      metadata: {
        available: true,
        attempted: true,
        changed: true,
      },
    }
  } catch {
    return {
      input,
      metadata: {
        available: true,
        attempted: true,
        changed: false,
      },
    }
  }
}
