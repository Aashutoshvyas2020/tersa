import * as React from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { stringWidth } from '../../ink/stringWidth.js'
import { Ansi, Text } from '../../ink.js'
import sliceAnsi from '../../utils/sliceAnsi.js'
import type { Theme } from '../../utils/theme.js'

type DividerProps = {
  width?: number
  color?: keyof Theme
  char?: string
  padding?: number
  title?: string
}

export type DividerParts = {
  left: string
  title: string | null
  right: string
}

function repeatToWidth(char: string, width: number): string {
  if (width <= 0) return ''
  const unit = stringWidth(char) > 0 ? char : '─'
  const unitWidth = Math.max(1, stringWidth(unit))
  const count = Math.floor(width / unitWidth)
  const used = count * unitWidth
  return `${unit.repeat(count)}${' '.repeat(Math.max(0, width - used))}`
}

export function buildDividerParts(args: {
  width: number
  char?: string
  title?: string
}): DividerParts {
  const width = Math.max(0, Math.floor(args.width))
  const char = args.char ?? '─'
  if (!args.title || width < 3) {
    return { left: repeatToWidth(char, width), title: null, right: '' }
  }

  const displayTitle = sliceAnsi(args.title, 0, Math.max(0, width - 2))
  const titleWidth = stringWidth(displayTitle)
  if (titleWidth === 0) {
    return { left: repeatToWidth(char, width), title: null, right: '' }
  }

  const lineWidth = Math.max(0, width - titleWidth - 2)
  const leftWidth = Math.floor(lineWidth / 2)
  const rightWidth = lineWidth - leftWidth
  return {
    left: repeatToWidth(char, leftWidth),
    title: displayTitle,
    right: repeatToWidth(char, rightWidth),
  }
}

export function Divider({
  width,
  color,
  char = '─',
  padding = 0,
  title,
}: DividerProps): React.ReactNode {
  const { columns } = useTerminalSize()
  const effectiveWidth = Math.max(0, (width ?? columns) - Math.max(0, padding))
  const parts = buildDividerParts({ width: effectiveWidth, char, title })
  const dimColor = !color

  if (parts.title === null) {
    return (
      <Text color={color} dimColor={dimColor} wrap="truncate-end">
        {parts.left}
      </Text>
    )
  }

  return (
    <Text color={color} dimColor={dimColor} wrap="truncate-end">
      {parts.left} <Ansi>{parts.title}</Ansi> {parts.right}
    </Text>
  )
}
