import { ANSI_RESET, ansiRgb } from '../../utils/terminalAnsi.js'
import type { RGB } from '../StartupScreen.palettes.js'

type Palette = {
  accent: RGB
  cream: RGB
  dim: RGB
  border: RGB
  gradient: readonly RGB[]
}

type Provider = {
  name: string
  model: string
  baseUrl: string
  isLocal: boolean
}

const LOGO_TERSA = [
  '████████╗███████╗██████╗ ███████╗ █████╗',
  '╚══██╔══╝██╔════╝██╔══██╗██╔════╝██╔══██╗',
  '   ██║   █████╗  ██████╔╝███████╗███████║',
  '   ██║   ██╔══╝  ██╔══██╗╚════██║██╔══██║',
  '   ██║   ███████╗██║  ██║███████║██║  ██║',
  '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
] as const

function truncate(value: string, width: number): string {
  if (width <= 0) return ''
  if (value.length <= width) return value
  if (width <= 3) return value.slice(0, width)
  return `${value.slice(0, width - 3)}...`
}

function boxRow(
  content: string,
  width: number,
  rawLength: number,
  border: RGB,
): string {
  const padding = Math.max(0, width - 2 - rawLength)
  return `${ansiRgb(...border)}│${ANSI_RESET}${content}${' '.repeat(padding)}${ansiRgb(...border)}│${ANSI_RESET}`
}

function renderWideStartup(args: {
  columns: number
  version: string
  provider: Provider
  caveRows: ReadonlyArray<readonly [string, string]>
  palette: Palette
  paintLine: (text: string, stops: readonly RGB[], lineT: number) => string
}): string[] {
  const outerWidth = Math.min(args.columns - 4, 118)
  const panelWidth = Math.floor((outerWidth - 2) / 2)
  const valueWidth = Math.max(18, panelWidth - 15)
  const lines: string[] = ['']

  for (let index = 0; index < LOGO_TERSA.length; index += 1) {
    lines.push(
      `  ${args.paintLine(
        LOGO_TERSA[index] ?? '',
        args.palette.gradient,
        index / (LOGO_TERSA.length - 1),
      )}`,
    )
  }
  lines.push('')

  const top = `${ansiRgb(...args.palette.border)}╔${'═'.repeat(panelWidth - 2)}╗${ANSI_RESET}`
  const divider = `${ansiRgb(...args.palette.border)}╠${'═'.repeat(panelWidth - 2)}╣${ANSI_RESET}`
  const bottom = `${ansiRgb(...args.palette.border)}╚${'═'.repeat(panelWidth - 2)}╝${ANSI_RESET}`

  const labeledRow = (
    label: string,
    value: string,
    color: RGB = args.palette.cream,
  ): [string, number] => {
    const paddedLabel = label.padEnd(9)
    const raw = ` ${paddedLabel} ${value}`
    return [
      ` ${ansiRgb(...args.palette.dim)}${paddedLabel}${ANSI_RESET} ${ansiRgb(...color)}${value}${ANSI_RESET}`,
      raw.length,
    ]
  }

  const providerPanel: string[] = [top]
  const providerColor: RGB = args.provider.isLocal
    ? [130, 175, 130]
    : args.palette.accent

  let [content, rawLength] = labeledRow(
    'Provider',
    truncate(args.provider.name, valueWidth),
    providerColor,
  )
  providerPanel.push(boxRow(content, panelWidth, rawLength, args.palette.border))

  ;[content, rawLength] = labeledRow(
    'Model',
    truncate(args.provider.model, valueWidth),
  )
  providerPanel.push(boxRow(content, panelWidth, rawLength, args.palette.border))

  ;[content, rawLength] = labeledRow(
    'Endpoint',
    truncate(args.provider.baseUrl, valueWidth),
  )
  providerPanel.push(boxRow(content, panelWidth, rawLength, args.palette.border))
  providerPanel.push(divider)

  const locality = args.provider.isLocal ? 'local' : 'cloud'
  const statusText = ` ● ${locality}    /help to begin`
  const statusContent = ` ${ansiRgb(...providerColor)}●${ANSI_RESET} ${ansiRgb(...args.palette.dim)}${locality}    ${ANSI_RESET}${ansiRgb(...args.palette.accent)}/help${ANSI_RESET}${ansiRgb(...args.palette.dim)} to begin${ANSI_RESET}`
  providerPanel.push(
    boxRow(
      statusContent,
      panelWidth,
      statusText.length,
      args.palette.border,
    ),
  )
  providerPanel.push(bottom)

  const modePanel: string[] = [top]
  for (const [label, value] of args.caveRows) {
    const [row, rowLength] = labeledRow(
      label,
      truncate(value, valueWidth),
    )
    modePanel.push(boxRow(row, panelWidth, rowLength, args.palette.border))
  }
  modePanel.push(bottom)

  const height = Math.max(providerPanel.length, modePanel.length)
  for (let index = 0; index < height; index += 1) {
    lines.push(
      `  ${providerPanel[index] ?? ' '.repeat(panelWidth)}  ${modePanel[index] ?? ''}`,
    )
  }

  lines.push(
    `  ${ansiRgb(...args.palette.dim)}tersa ${ANSI_RESET}${ansiRgb(...args.palette.accent)}v${args.version}${ANSI_RESET}`,
    '',
  )

  return lines
}

export function renderResponsiveStartup(args: {
  columns: number
  rows: number
  version: string
  provider: Provider
  caveRows: ReadonlyArray<readonly [string, string]>
  palette: Palette
  paintLine: (text: string, stops: readonly RGB[], lineT: number) => string
}): string[] {
  const columns = Math.max(1, args.columns)
  const contentWidth = Math.max(1, columns - 4)
  const lines: string[] = ['']

  if (columns >= 120) {
    return renderWideStartup({ ...args, columns })
  }

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
