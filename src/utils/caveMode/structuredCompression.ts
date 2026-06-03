import type { TextCompressionResult } from './types.js'

const COMMAND_KEY_HINTS: Array<{ pattern: RegExp; keys: string[] }> = [
  {
    pattern: /\bdocker\s+inspect\b/i,
    keys: ['Id', 'Name', 'Image', 'Config', 'State', 'Mounts', 'NetworkSettings'],
  },
  {
    pattern: /\bdocker\s+ps\b/i,
    keys: ['ID', 'Image', 'Names', 'Status', 'Ports', 'Command'],
  },
  {
    pattern: /\bnpm\s+ls\b/i,
    keys: ['name', 'version', 'dependencies', 'problems'],
  },
  {
    pattern: /\bkubectl\b/i,
    keys: ['apiVersion', 'kind', 'metadata', 'spec', 'status', 'items'],
  },
  {
    pattern: /\baws\b/i,
    keys: ['Arn', 'Name', 'Id', 'State', 'Items', 'Buckets', 'Tables'],
  },
  {
    pattern: /(package\.json|tsconfig)/i,
    keys: ['name', 'version', 'private', 'scripts', 'dependencies', 'devDependencies', 'compilerOptions'],
  },
]

function lineCount(text: string): number {
  return text === '' ? 0 : text.split('\n').length
}

function isMeaningfulReduction(original: string, next: string): boolean {
  if (next.length >= original.length) return false
  const saved = original.length - next.length
  return saved >= 200 || next.length <= Math.floor(original.length * 0.9)
}

function summarizeValue(value: unknown, depth = 0): unknown {
  if (depth >= 2) {
    if (Array.isArray(value)) {
      return `[array(${value.length})]`
    }
    if (value && typeof value === 'object') {
      return '[object]'
    }
    return value
  }

  if (Array.isArray(value)) {
    if (value.length <= 6) {
      return value.map(item => summarizeValue(item, depth + 1))
    }
    return [
      ...value.slice(0, 4).map(item => summarizeValue(item, depth + 1)),
      `... ${value.length - 4} more items`,
    ]
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    const slice = entries.slice(0, 8)
    const summarized = Object.fromEntries(
      slice.map(([key, child]) => [key, summarizeValue(child, depth + 1)]),
    )
    if (entries.length > slice.length) {
      ;(summarized as Record<string, unknown>).__truncated = `${entries.length - slice.length} more keys`
    }
    return summarized
  }

  return value
}

function pickHintKeys(command: string): string[] | null {
  for (const hint of COMMAND_KEY_HINTS) {
    if (hint.pattern.test(command)) return hint.keys
  }
  return null
}

export function maybeCompressJsonText(
  text: string,
  command: string,
): TextCompressionResult {
  if (lineCount(text) <= 50) {
    return { text, changed: false, strategies: [] }
  }

  try {
    const parsed = JSON.parse(text) as unknown
    const hintKeys = pickHintKeys(command)
    let reduced: unknown

    if (Array.isArray(parsed)) {
      reduced = summarizeValue(parsed)
    } else if (parsed && typeof parsed === 'object') {
      const entries = Object.entries(parsed)
      const keyed = new Set(hintKeys ?? entries.slice(0, 8).map(([key]) => key))
      reduced = Object.fromEntries(
        entries
          .filter(([key]) => keyed.has(key))
          .map(([key, value]) => [key, summarizeValue(value)]),
      )
    } else {
      return { text, changed: false, strategies: [] }
    }

    const next = JSON.stringify(reduced, null, 2)
    if (!isMeaningfulReduction(text, next)) {
      return { text, changed: false, strategies: [] }
    }

    return { text: next, changed: true, strategies: ['json'] }
  } catch {
    return { text, changed: false, strategies: [] }
  }
}

export function maybeCompressXmlText(text: string): TextCompressionResult {
  const withoutNamespaces = text.replace(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
  const lines = withoutNamespaces.split('\n')
  if (lines.length <= 50) {
    return { text, changed: false, strategies: [] }
  }

  const seen = new Map<string, number>()
  const repeatedTags = new Map<string, number>()
  const output: string[] = []

  for (const line of lines) {
    const normalized = line.trim()
    if (normalized === '') {
      output.push(line)
      continue
    }

    const repeatedTagMatch = normalized.match(/^<([\w:-]+)(?:\s|>)/)
    if (repeatedTagMatch) {
      const tagName = repeatedTagMatch[1]!
      const repeatedCount = repeatedTags.get(tagName) ?? 0
      repeatedTags.set(tagName, repeatedCount + 1)

      if (repeatedCount >= 4) {
        if (repeatedCount === 4) {
          output.push(`<!-- repeated <${tagName}> entries omitted -->`)
        }
        continue
      }
    }

    const count = seen.get(normalized) ?? 0
    seen.set(normalized, count + 1)

    if (count < 4) {
      output.push(line)
    } else if (count === 4) {
      output.push(`<!-- repeated: ${normalized.slice(0, 60)} -->`)
    }
  }

  const next = output.join('\n')
  const namespaceChanged = withoutNamespaces !== text
  const saved = text.length - next.length
  if (!namespaceChanged && !isMeaningfulReduction(text, next) && saved < 40) {
    return { text, changed: false, strategies: [] }
  }

  return { text: next, changed: true, strategies: ['xml'] }
}

export function compressStructuredBashOutput(
  text: string,
  command: string,
): TextCompressionResult {
  if (lineCount(text) <= 50) {
    return { text, changed: false, strategies: [] }
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return maybeCompressJsonText(text, command)
  }

  if (trimmed.startsWith('<')) {
    return maybeCompressXmlText(text)
  }

  return { text, changed: false, strategies: [] }
}
