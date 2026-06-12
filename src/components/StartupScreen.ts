/**
 * Tersa startup screen.
 * Called once at CLI startup before the Ink UI renders.
 */

import { getSettings_DEPRECATED } from '../utils/settings/settings.js'
import { parseUserSpecifiedModel } from '../utils/model/model.js'
import { getGlobalConfig } from '../utils/config.js'
import { ANSI_RESET, ansiRgb } from '../utils/terminalAnsi.js'
import {
  resolveLogoPalette,
  type RGB,
} from './StartupScreen.palettes.js'
import {
  getTersaCaveStatusRows,
  resolveStartupProviderDetails,
} from '../utils/tersaStatus.js'

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

const RESET = ANSI_RESET

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function gradAt(stops: readonly RGB[], t: number): RGB {
  const c = Math.max(0, Math.min(1, t))
  const s = c * (stops.length - 1)
  const i = Math.floor(s)
  if (i >= stops.length - 1) return stops[stops.length - 1]
  return lerp(stops[i], stops[i + 1], s - i)
}

export function paintLine(text: string, stops: readonly RGB[], lineT: number): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const t = text.length > 1 ? lineT * 0.5 + (i / (text.length - 1)) * 0.5 : lineT
    const [r, g, b] = gradAt(stops, t)
    out += `${ansiRgb(r, g, b)}${text[i]}`
  }
  return out + RESET
}

const LOGO_TERSA = [
  '████████╗███████╗██████╗ ███████╗ █████╗',
  '╚══██╔══╝██╔════╝██╔══██╗██╔════╝██╔══██╗',
  '   ██║   █████╗  ██████╔╝███████╗███████║',
  '   ██║   ██╔══╝  ██╔══██╗╚════██║██╔══██║',
  '   ██║   ███████╗██║  ██║███████║██║  ██║',
  '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
] as const

// ─── Provider detection ───────────────────────────────────────────────────────

export function detectProvider(modelOverride?: string): { name: string; model: string; baseUrl: string; isLocal: boolean } {
  const settings = getSettings_DEPRECATED() || {}
  const provider = resolveStartupProviderDetails(modelOverride)
  const modelSetting =
    modelOverride ||
    process.env.ANTHROPIC_MODEL ||
    process.env.CLAUDE_MODEL ||
    process.env.OPENAI_MODEL ||
    settings.model ||
    provider.model

  return {
    ...provider,
    model:
      provider.name === 'Anthropic' || provider.name === 'MiniMax'
        ? parseUserSpecifiedModel(modelSetting)
        : provider.model,
  }
}

// ─── Box drawing ──────────────────────────────────────────────────────────────

function boxRow(content: string, width: number, rawLen: number, border: RGB): string {
  const pad = Math.max(0, width - 2 - rawLen)
  return `${ansiRgb(...border)}\u2502${RESET}${content}${' '.repeat(pad)}${ansiRgb(...border)}\u2502${RESET}`
}

function truncateForBox(value: string, maxChars: number): string {
  if (maxChars <= 3) return value.slice(0, Math.max(maxChars, 0))
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars - 3)}...`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function printStartupScreen(modelOverride?: string): void {
  // Skip in non-interactive / CI / print mode
  if (process.env.CI || !process.stdout.isTTY) return

  process.stdout.write('\u001b[2J\u001b[3J\u001b[H')

  const palette = resolveLogoPalette(getGlobalConfig().logoColor)
  const ACCENT = palette.accent
  const CREAM = palette.cream
  const DIMCOL = palette.dim
  const BORDER = palette.border
  const GRAD = palette.gradient

  const p = detectProvider(modelOverride)
  const caveRows = getTersaCaveStatusRows()
  const columns = process.stdout.columns ?? 80
  const dualColumn = columns >= 110
  const outerWidth = Math.max(62, Math.min(columns - 4, 118))
  const panelWidth = dualColumn
    ? Math.max(30, Math.floor((outerWidth - 2) / 2))
    : outerWidth
  const VALUE_WIDTH = Math.max(18, panelWidth - 15)
  const out: string[] = []

  out.push('')
  const total = LOGO_TERSA.length
  for (let i = 0; i < total; i++) {
    out.push(`  ${paintLine(LOGO_TERSA[i] ?? '', GRAD, total > 1 ? i / (total - 1) : 0)}`)
  }
  out.push('')

  const top = `${ansiRgb(...BORDER)}\u2554${'\u2550'.repeat(panelWidth - 2)}\u2557${RESET}`
  const divider = `${ansiRgb(...BORDER)}\u2560${'\u2550'.repeat(panelWidth - 2)}\u2563${RESET}`
  const bottom = `${ansiRgb(...BORDER)}\u255a${'\u2550'.repeat(panelWidth - 2)}\u255d${RESET}`

  const lbl = (k: string, v: string, c: RGB = CREAM): [string, number] => {
    const padK = k.padEnd(9)
    return [` ${ansiRgb(...DIMCOL)}${padK}${RESET} ${ansiRgb(...c)}${v}${RESET}`, ` ${padK} ${v}`.length]
  }

  const providerBox: string[] = []
  providerBox.push(top)
  const provC: RGB = p.isLocal ? [130, 175, 130] : ACCENT
  let [r, l] = lbl('Provider', truncateForBox(p.name, VALUE_WIDTH), provC)
  providerBox.push(boxRow(r, panelWidth, l, BORDER))
  ;[r, l] = lbl('Model', truncateForBox(p.model, VALUE_WIDTH))
  providerBox.push(boxRow(r, panelWidth, l, BORDER))
  const ep = truncateForBox(p.baseUrl, VALUE_WIDTH)
  ;[r, l] = lbl('Endpoint', ep)
  providerBox.push(boxRow(r, panelWidth, l, BORDER))
  providerBox.push(divider)

  const sC: RGB = p.isLocal ? [130, 175, 130] : ACCENT
  const sL = p.isLocal ? 'local' : 'cloud'
  const sRow = ` ${ansiRgb(...sC)}\u25cf${RESET} ${ansiRgb(...DIMCOL)}${sL}${RESET}    ${ansiRgb(...DIMCOL)}Ready \u2014 type ${RESET}${ansiRgb(...ACCENT)}/help${RESET}${ansiRgb(...DIMCOL)} to begin${RESET}`
  const sLen = ` \u25cf ${sL}    Ready \u2014 type /help to begin`.length
  providerBox.push(boxRow(sRow, panelWidth, sLen, BORDER))
  providerBox.push(bottom)

  const caveBox: string[] = []
  caveBox.push(top)
  for (const [label, value] of caveRows) {
    const [row, rowLen] = lbl(label, truncateForBox(value, VALUE_WIDTH))
    caveBox.push(boxRow(row, panelWidth, rowLen, BORDER))
  }
  caveBox.push(bottom)

  if (dualColumn) {
    const gap = '  '
    const height = Math.max(providerBox.length, caveBox.length)
    for (let i = 0; i < height; i++) {
      out.push(`  ${(providerBox[i] ?? ' '.repeat(panelWidth))}${gap}${caveBox[i] ?? ''}`)
    }
  } else {
    out.push(...providerBox.map(line => `  ${line}`))
    out.push('')
    out.push(...caveBox.map(line => `  ${line}`))
  }

  out.push(`  ${ansiRgb(...DIMCOL)}tersa ${RESET}${ansiRgb(...ACCENT)}v${MACRO.DISPLAY_VERSION ?? MACRO.VERSION}${RESET}`)
  out.push('')

  process.stdout.write(out.join('\n') + '\n')
}
