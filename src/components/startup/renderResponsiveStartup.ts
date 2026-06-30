import { ANSI_RESET, ansiRgb } from '../../utils/terminalAnsi.js'
import type { RGB } from '../StartupScreen.palettes.js'

type Palette = {
  accent: RGB
  cream: RGB
  dim: RGB
  gradient: readonly RGB[]
}

type Provider = {
  name: string
  model: string
  isLocal: boolean
}

function truncate(value: string, width: number): string {
  if (width <= 0) return ''
  if (value.length <= width) return value
  if (width <= 3) return value.slice(0, width)
  return `${value.slice(0, width - 3)}...`
}

export function renderResponsiveStartup(args: {
  columns: number
  rows: number
  version: string
  provider: Provider
  palette: Palette
  paintLine: (text: string, stops: readonly RGB[], lineT: number) => string
}): string[] {
  const columns = Math.max(1, args.columns)
  const contentWidth = Math.max(1, columns - 4)
  const lines: string[] = ['']

  if (columns < 40) {
    lines.push(
      `  ${ansiRgb(...args.palette.accent)}Tersa${ANSI_RESET} ${ansiRgb(...args.palette.dim)}v${args.version}${ANSI_RESET}`,
      '',
      `  ${ansiRgb(...args.palette.cream)}Terminal width: ${columns}${ANSI_RESET}`,
      `  ${ansiRgb(...args.palette.dim)}Resize to at least 40 columns.${ANSI_RESET}`,
      '',
    )
    return lines
  }

  lines.push(`  ${args.paintLine('TERSA', args.palette.gradient, 0.5)}`)
  lines.push(`  ${ansiRgb(...args.palette.dim)}v${args.version}${ANSI_RESET}`, '')

  if (columns >= 60) {
    const valueWidth = Math.max(12, contentWidth - 12)
    lines.push(
      `  ${ansiRgb(...args.palette.dim)}Provider  ${ANSI_RESET}${ansiRgb(...args.palette.accent)}${truncate(args.provider.name, valueWidth)}${ANSI_RESET}`,
      `  ${ansiRgb(...args.palette.dim)}Model     ${ANSI_RESET}${ansiRgb(...args.palette.cream)}${truncate(args.provider.model, valueWidth)}${ANSI_RESET}`,
    )
  } else {
    lines.push(
      `  ${ansiRgb(...args.palette.dim)}Provider${ANSI_RESET}`,
      `  ${ansiRgb(...args.palette.accent)}${truncate(args.provider.name, contentWidth)}${ANSI_RESET}`,
      `  ${ansiRgb(...args.palette.dim)}Model${ANSI_RESET}`,
      `  ${ansiRgb(...args.palette.cream)}${truncate(args.provider.model, contentWidth)}${ANSI_RESET}`,
    )
  }

  const statusColor: RGB = args.provider.isLocal
    ? [130, 175, 130]
    : args.palette.accent
  lines.push(
    '',
    `  ${ansiRgb(...statusColor)}* ready${ANSI_RESET}${ansiRgb(...args.palette.dim)} - ${args.provider.isLocal ? 'local' : 'cloud'} - /help${ANSI_RESET}`,
    '',
  )
  return lines
}
