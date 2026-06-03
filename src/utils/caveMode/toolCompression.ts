import stripAnsi from 'strip-ansi'
import { compressStructuredBashOutput } from './structuredCompression.js'
import { getCaveModeConfig } from './config.js'
import type {
  CaveCompressionMetadata,
  CaveCompressionStrategy,
  LineBudget,
  ProcessCaveToolResultArgs,
  ProcessCaveToolResultResult,
  TextCompressionResult,
} from './types.js'

const BUDGETS = {
  bash: { maxLines: 80, headLines: 50, tailLines: 30 },
  read: { maxLines: 300, headLines: 200, tailLines: 100 },
  grep: { maxLines: 120, headLines: 80, tailLines: 40 },
  list: { maxLines: 60, headLines: 40, tailLines: 20 },
  fallback: { maxLines: 150, headLines: 100, tailLines: 50 },
} as const

function countChars(value: unknown): number {
  if (typeof value === 'string') return value.length
  try {
    return JSON.stringify(value)?.length ?? 0
  } catch {
    return String(value ?? '').length
  }
}

function computeStrategy(
  changed: boolean,
  strategies: CaveCompressionStrategy[],
): CaveCompressionStrategy {
  if (!changed || strategies.length === 0) return 'none'
  const unique = Array.from(new Set(strategies))
  if (unique.length === 1) return unique[0]!
  return 'combined'
}

function buildMetadata(
  toolName: string,
  original: unknown,
  next: unknown,
  changed: boolean,
  strategies: CaveCompressionStrategy[],
): CaveCompressionMetadata {
  const originalChars = countChars(original)
  const compressedChars = countChars(next)
  return {
    caveModeEnabled: true,
    toolName,
    originalChars,
    compressedChars,
    compressionRatio:
      originalChars === 0 ? 1 : Number((compressedChars / originalChars).toFixed(4)),
    strategy: computeStrategy(changed, strategies),
    changed,
  }
}

function lineCount(text: string): number {
  return text === '' ? 0 : text.split('\n').length
}

function isMeaningfulReduction(original: string, next: string): boolean {
  if (next.length >= original.length) return false
  const saved = original.length - next.length
  return saved >= 200 || next.length <= Math.floor(original.length * 0.9)
}

export function stripAnsiSequences(text: string): string {
  return stripAnsi(text)
}

export function collapseBlankLines(text: string): string {
  return text.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n')
}

export function truncateToLineBudget(
  text: string,
  budget: LineBudget,
): { text: string; changed: boolean } {
  const lines = text.split('\n')
  if (lines.length <= budget.maxLines) {
    return { text, changed: false }
  }

  const head = lines.slice(0, budget.headLines)
  const tail = lines.slice(-budget.tailLines)
  const omitted = lines.length - head.length - tail.length
  const marker = `...[${omitted} lines omitted]...`
  return {
    text: [...head, marker, ...tail].join('\n'),
    changed: true,
  }
}

function compressText(
  text: string,
  budget: LineBudget,
  options: {
    allowStructured: boolean
    command?: string
    isError: boolean
  },
): TextCompressionResult {
  let next = text
  const strategies: Array<
    Exclude<CaveCompressionStrategy, 'none' | 'read_dedup'>
  > = []

  const stripped = stripAnsiSequences(next)
  if (stripped !== next) {
    next = stripped
    strategies.push('ansi')
  }

  const collapsed = collapseBlankLines(next)
  if (collapsed !== next) {
    next = collapsed
    strategies.push('blank_lines')
  }

  if (options.isError) {
    return { text: next, changed: next !== text, strategies }
  }

  if (options.allowStructured && options.command) {
    const structured = compressStructuredBashOutput(next, options.command)
    if (structured.changed) {
      next = structured.text
      strategies.push(...structured.strategies)
    }
  }

  const truncated = truncateToLineBudget(next, budget)
  if (truncated.changed) {
    next = truncated.text
    strategies.push('budget')
  }

  if (!isMeaningfulReduction(text, next) && strategies.some(s => s === 'json' || s === 'xml')) {
    return { text, changed: false, strategies: [] }
  }

  return { text: next, changed: next !== text, strategies }
}

function selectBudget(
  toolName: string,
  input: unknown,
): LineBudget {
  if (toolName === 'Read') return BUDGETS.read
  if (toolName === 'Grep') return BUDGETS.grep
  if (toolName === 'Glob') return BUDGETS.list
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    const command =
      input && typeof input === 'object' && 'command' in input
        ? String((input as { command?: unknown }).command ?? '')
        : ''
    if (/\b(rg|grep|ag|ack)\b/.test(command)) return BUDGETS.grep
    if (/\b(ls|find|tree|fd)\b/.test(command)) return BUDGETS.list
    return BUDGETS.bash
  }
  return BUDGETS.fallback
}

function compressStringField(
  output: Record<string, unknown>,
  field: string,
  args: ProcessCaveToolResultArgs,
  allowStructured: boolean,
): ProcessCaveToolResultResult {
  const value = output[field]
  if (typeof value !== 'string') {
    return {
      output,
      changed: false,
      metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
    }
  }

  const command =
    args.input && typeof args.input === 'object' && 'command' in args.input
      ? String((args.input as { command?: unknown }).command ?? '')
      : undefined
  const result = compressText(value, selectBudget(args.toolName, args.input), {
    allowStructured,
    command,
    isError: args.isError,
  })

  if (!result.changed) {
    return {
      output,
      changed: false,
      metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
    }
  }

  const next = { ...output, [field]: result.text }
  return {
    output: next,
    changed: true,
    metadata: buildMetadata(args.toolName, args.output, next, true, result.strategies),
  }
}

function compressFilenameArray(
  output: Record<string, unknown>,
  field: string,
  budget: LineBudget,
  args: ProcessCaveToolResultArgs,
): ProcessCaveToolResultResult {
  const value = output[field]
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    return {
      output,
      changed: false,
      metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
    }
  }

  const truncated = truncateToLineBudget(value.join('\n'), budget)
  if (!truncated.changed) {
    return {
      output,
      changed: false,
      metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
    }
  }

  const next = { ...output, [field]: truncated.text.split('\n') }
  return {
    output: next,
    changed: true,
    metadata: buildMetadata(args.toolName, args.output, next, true, ['budget']),
  }
}

export function processCaveToolResult(
  args: ProcessCaveToolResultArgs,
): ProcessCaveToolResultResult {
  const config = getCaveModeConfig()
  if (!config.enabled || !config.toolCompression) {
    return {
      output: args.output,
      changed: false,
      metadata: {
        caveModeEnabled: false,
        toolName: args.toolName,
        originalChars: countChars(args.output),
        compressedChars: countChars(args.output),
        compressionRatio: 1,
        strategy: 'none',
        changed: false,
      },
    }
  }

  if (config.intensity === 'light' && typeof args.output === 'string') {
    const result = compressText(args.output, BUDGETS.fallback, {
      allowStructured: false,
      isError: args.isError,
    })
    return {
      output: result.changed ? result.text : args.output,
      changed: result.changed,
      metadata: buildMetadata(
        args.toolName,
        args.output,
        result.changed ? result.text : args.output,
        result.changed,
        result.strategies,
      ),
    }
  }

  if (args.toolName === 'Read' && args.output && typeof args.output === 'object') {
    const output = args.output as Record<string, unknown>
    if (output.type === 'file_unchanged') {
      return {
        output: args.output,
        changed: false,
        metadata: buildMetadata(args.toolName, args.output, args.output, false, ['read_dedup']),
      }
    }
    if (output.type === 'text' && output.file && typeof output.file === 'object') {
      const file = output.file as Record<string, unknown>
      if (typeof file.content === 'string') {
        const result = compressText(file.content, BUDGETS.read, {
          allowStructured: false,
          isError: args.isError,
        })
        if (result.changed) {
          const next = {
            ...output,
            file: { ...file, content: result.text },
          }
          return {
            output: next,
            changed: true,
            metadata: buildMetadata(args.toolName, args.output, next, true, result.strategies),
          }
        }
      }
    }
    return {
      output: args.output,
      changed: false,
      metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
    }
  }

  if (typeof args.output === 'string') {
    const result = compressText(args.output, selectBudget(args.toolName, args.input), {
      allowStructured: args.toolName === 'Bash' && config.structuredCompression,
      command:
        args.input && typeof args.input === 'object' && 'command' in args.input
          ? String((args.input as { command?: unknown }).command ?? '')
          : undefined,
      isError: args.isError,
    })
    return {
      output: result.changed ? result.text : args.output,
      changed: result.changed,
      metadata: buildMetadata(
        args.toolName,
        args.output,
        result.changed ? result.text : args.output,
        result.changed,
        result.strategies,
      ),
    }
  }

  if (args.output && typeof args.output === 'object') {
    const output = args.output as Record<string, unknown>
    if (
      (args.toolName === 'Bash' || args.toolName === 'PowerShell') &&
      (typeof output.stdout === 'string' || typeof output.output === 'string')
    ) {
      return compressStringField(
        output,
        typeof output.stdout === 'string' ? 'stdout' : 'output',
        args,
        args.toolName === 'Bash' && config.structuredCompression && config.intensity === 'full',
      )
    }
    if (args.toolName === 'Grep') {
      if (typeof output.content === 'string') {
        return compressStringField(output, 'content', args, false)
      }
      return compressFilenameArray(output, 'filenames', BUDGETS.grep, args)
    }
    if (args.toolName === 'Glob') {
      return compressFilenameArray(output, 'filenames', BUDGETS.list, args)
    }
  }

  return {
    output: args.output,
    changed: false,
    metadata: buildMetadata(args.toolName, args.output, args.output, false, []),
  }
}
