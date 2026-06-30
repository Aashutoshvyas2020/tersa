export type TerminalWidthBand =
  | 'unsupported'
  | 'minimal'
  | 'compact'
  | 'standard'
  | 'wide'

export function getTerminalWidthBand(columns: number): TerminalWidthBand {
  if (columns < 40) return 'unsupported'
  if (columns < 60) return 'minimal'
  if (columns < 80) return 'compact'
  if (columns < 110) return 'standard'
  return 'wide'
}

export function getResponsiveWidth(args: {
  terminalWidth: number
  availableWidth?: number
  horizontalPadding?: number
  maxWidth?: number
}): number {
  const terminalWidth = Math.max(0, Math.floor(args.terminalWidth))
  const availableWidth = Math.max(
    0,
    Math.floor(args.availableWidth ?? terminalWidth),
  )
  const padding = Math.max(0, Math.floor(args.horizontalPadding ?? 0))
  const maxWidth = Math.max(1, Math.floor(args.maxWidth ?? 120))
  return Math.max(0, Math.min(terminalWidth, availableWidth, maxWidth) - padding)
}

export function shouldStackResponsiveRow(
  width: number,
  stackBelow = 60,
): boolean {
  return width < stackBelow
}

export function getVisibleRowBudget(
  terminalRows: number,
  reservedRows = 6,
): number {
  return Math.max(1, Math.floor(terminalRows) - Math.max(0, reservedRows))
}
