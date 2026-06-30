import * as React from 'react'
import { useMemo } from 'react'
import { type Command, formatDescriptionWithSource } from '../../commands.js'
import { useSearchInput } from '../../hooks/useSearchInput.js'
import { Box, Text, useTerminalFocus } from '../../ink.js'
import { truncate } from '../../utils/format.js'
import { SearchBox } from '../SearchBox.js'
import { ResponsiveRow } from '../design-system/ResponsiveRow.js'
import { useTabHeaderFocus } from '../design-system/Tabs.js'

type Props = {
  commands: Command[]
  maxHeight: number
  columns: number
  title: string
  onCancel: () => void
  emptyMessage?: string
}

export type HelpCommandSummary = {
  name: string
  description: string
}

export function filterHelpCommands(
  commands: Command[],
  query: string,
): HelpCommandSummary[] {
  const seen = new Set<string>()
  const summaries = commands.flatMap(command => {
    if (seen.has(command.name)) return []
    seen.add(command.name)
    return [
      {
        name: command.name,
        description: formatDescriptionWithSource(command),
      },
    ]
  })
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return summaries.sort((a, b) => a.name.localeCompare(b.name))
  }

  return summaries
    .filter(command =>
      `${command.name} ${command.description}`.toLowerCase().includes(normalized),
    )
    .sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(normalized) ? 0 : 1
      const bPrefix = b.name.toLowerCase().startsWith(normalized) ? 0 : 1
      return aPrefix - bPrefix || a.name.localeCompare(b.name)
    })
}

export function Commands({
  commands,
  maxHeight,
  columns,
  title,
  onCancel,
  emptyMessage = 'No commands found',
}: Props): React.ReactNode {
  const { headerFocused, focusHeader } = useTabHeaderFocus()
  const isTerminalFocused = useTerminalFocus()
  const { query, cursorOffset, handleKeyDown } = useSearchInput({
    isActive: !headerFocused,
    onExit: focusHeader,
    onExitUp: focusHeader,
    onCancel,
    backspaceExitsOnEmpty: false,
    columns,
  })
  const filtered = useMemo(
    () => filterHelpCommands(commands, query),
    [commands, query],
  )
  const compact = columns < 60
  const rowHeight = compact ? 2 : 1
  const visibleCount = Math.max(
    2,
    Math.floor((Math.max(8, maxHeight) - 7) / rowHeight),
  )
  const visible = filtered.slice(0, visibleCount)
  const descriptionWidth = Math.max(12, columns - (compact ? 8 : 32))

  return (
    <Box
      flexDirection="column"
      paddingY={1}
      gap={1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Text>{title}</Text>
      <SearchBox
        query={query}
        cursorOffset={cursorOffset}
        placeholder="Filter commands…"
        isFocused={!headerFocused}
        isTerminalFocused={isTerminalFocused}
        width="100%"
      />
      <Box flexDirection="column">
        {visible.length === 0 ? (
          <Text dimColor>{query ? 'No matching commands' : emptyMessage}</Text>
        ) : (
          visible.map(command => (
            <ResponsiveRow key={command.name} stackBelow={60} gap={1}>
              <Box width={compact ? undefined : 24} flexShrink={0}>
                <Text color="suggestion">/{command.name}</Text>
              </Box>
              <Text dimColor wrap="truncate-end">
                {truncate(command.description, descriptionWidth, true)}
              </Text>
            </ResponsiveRow>
          ))
        )}
      </Box>
      <Text dimColor>
        {filtered.length === 0
          ? 'Esc closes help'
          : `${Math.min(visible.length, filtered.length)} of ${filtered.length} · type to filter · ↑ returns to tabs`}
      </Text>
    </Box>
  )
}
