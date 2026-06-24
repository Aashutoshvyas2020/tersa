import Fuse from 'fuse.js'
import {
  formatDescriptionWithSource,
  getCommandName,
  isDollarInvocableCommand,
  type Command,
} from '../../commands.js'
import type { SuggestionItem } from '../../components/PromptInput/PromptInputFooterSuggestions.js'

const DOLLAR_TOKEN_RE = /(^|\s)\$([A-Za-z_][A-Za-z0-9_:\-./]*)?$/
const DOLLAR_NAME_RE = /(^|\s)\$([A-Za-z_][A-Za-z0-9_:\-./]*)/g

export type DollarInvocationToken = {
  startPos: number
  token: string
  partialName: string
}

export function findDollarInvocationToken(
  input: string,
  cursorOffset: number,
): DollarInvocationToken | null {
  const beforeCursor = input.slice(0, cursorOffset)
  if (beforeCursor.endsWith('${')) return null
  const match = beforeCursor.match(DOLLAR_TOKEN_RE)
  if (!match || match.index === undefined) return null

  const startPos = match.index + (match[1]?.length ?? 0)
  const afterCursor = input.slice(cursorOffset)
  const suffix = afterCursor.match(/^[A-Za-z0-9_:\-./]*/)?.[0] ?? ''
  const partialName = `${match[2] ?? ''}${suffix}`

  return {
    startPos,
    token: `$${partialName}`,
    partialName,
  }
}

function toSuggestion(cmd: Command, commands: Command[]): SuggestionItem {
  const source = getDollarInvocationSource(cmd)
  const name = getDollarInvocationAliases(cmd, commands)[0] ?? getDollarInvocationId(cmd)
  return {
    id: `dollar-${name}`,
    displayText: `$${name}`,
    tag: source,
    description: formatDescriptionWithSource(cmd),
    metadata: cmd,
  }
}

export function getDollarInvocationSource(cmd: Command): 'mcp' | 'plugin' | 'skill' {
  const source = cmd.type === 'prompt' ? cmd.source : undefined
  return (
    source === 'mcp' || cmd.isMcp || cmd.loadedFrom === 'mcp'
      ? 'mcp'
      : source === 'plugin' || cmd.loadedFrom === 'plugin'
        ? 'plugin'
        : 'skill'
  )
}

export function getDollarInvocationId(cmd: Command): string {
  const name = getCommandName(cmd)
  return `${getDollarInvocationSource(cmd)}:${name}`
}

export function getDollarInvocationAliases(cmd: Command, commands: Command[]): string[] {
  const name = getCommandName(cmd)
  const sameName = commands.filter(other => getCommandName(other) === name)
  return sameName.length === 1 ? [name, getDollarInvocationId(cmd)] : [getDollarInvocationId(cmd)]
}

export function generateDollarInvocationSuggestions(
  input: string,
  cursorOffset: number,
  commands: Command[],
): SuggestionItem[] {
  const token = findDollarInvocationToken(input, cursorOffset)
  if (!token) return []

  const invocable = commands.filter(isDollarInvocableCommand)
  if (!token.partialName) {
    return invocable.map(cmd => toSuggestion(cmd, invocable))
  }

  const fuse = new Fuse(
    invocable.map(command => ({
      command,
      name: getCommandName(command),
      invocationId: getDollarInvocationId(command),
      description: command.description ?? '',
      whenToUse: command.whenToUse ?? '',
      aliases: [...getDollarInvocationAliases(command, invocable), ...(command.aliases ?? [])],
    })),
    {
      includeScore: true,
      threshold: 0.3,
      keys: [
        { name: 'name', weight: 3 },
        { name: 'invocationId', weight: 3 },
        { name: 'aliases', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'whenToUse', weight: 1 },
      ],
    },
  )

  const query = token.partialName.toLowerCase()
  return fuse
    .search(token.partialName)
    .sort((a, b) => {
      const aPrefix = getDollarInvocationAliases(a.item.command, invocable).some(alias => alias.toLowerCase().startsWith(query))
      const bPrefix = getDollarInvocationAliases(b.item.command, invocable).some(alias => alias.toLowerCase().startsWith(query))
      if (aPrefix !== bPrefix) return aPrefix ? -1 : 1
      return (a.score ?? 0) - (b.score ?? 0)
    })
    .map(result => toSuggestion(result.item.command, invocable))
}

export function applyDollarInvocationSuggestion(
  suggestion: SuggestionItem,
  input: string,
  cursorOffset: number,
  onInputChange: (value: string) => void,
  setCursorOffset: (offset: number) => void,
): void {
  const token = findDollarInvocationToken(input, cursorOffset)
  if (!token) return
  const replacement = `${suggestion.displayText} `
  const newInput =
    input.slice(0, token.startPos) +
    replacement +
    input.slice(token.startPos + token.token.length)
  onInputChange(newInput)
  setCursorOffset(token.startPos + replacement.length)
}

export function findDollarInvocationPositions(
  input: string,
  commands: Command[],
): Array<{ start: number; end: number }> {
  const invocable = commands.filter(isDollarInvocableCommand)
  const names = new Set(invocable.flatMap(cmd => getDollarInvocationAliases(cmd, invocable)))
  const positions: Array<{ start: number; end: number }> = []
  for (const match of input.matchAll(DOLLAR_NAME_RE)) {
    const name = match[2]
    if (!name || !names.has(name) || match.index === undefined) continue
    const start = match.index + (match[1]?.length ?? 0)
    positions.push({ start, end: start + name.length + 1 })
  }
  return positions
}

function isInsideCode(input: string, index: number): boolean {
  let fenced = false
  let inline = false
  for (let i = 0; i < index; i++) {
    if (input.startsWith('```', i)) {
      fenced = !fenced
      i += 2
      continue
    }
    if (!fenced && input[i] === '`') inline = !inline
  }
  return fenced || inline
}

export function findDollarInvocations(
  input: string,
  commands: Command[],
): Array<{ id: string; command: Command }> {
  const invocable = commands.filter(isDollarInvocableCommand)
  const byAlias = new Map<string, Command>()
  for (const cmd of invocable) {
    for (const alias of getDollarInvocationAliases(cmd, invocable)) {
      byAlias.set(alias, cmd)
    }
  }

  const seen = new Set<string>()
  const result: Array<{ id: string; command: Command }> = []
  for (const match of input.matchAll(DOLLAR_NAME_RE)) {
    if (match.index === undefined || !match[2]) continue
    const dollarIndex = match.index + (match[1]?.length ?? 0)
    if (input[dollarIndex - 1] === '\\' || isInsideCode(input, dollarIndex)) continue
    const cmd = byAlias.get(match[2])
    if (!cmd) continue
    const id = getDollarInvocationId(cmd)
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ id, command: cmd })
  }
  return result
}
