/**
 * Tersa startup screen.
 * Called once at CLI startup before the Ink UI renders.
 */

import { getGlobalConfig } from '../utils/config.js'
import { parseUserSpecifiedModel } from '../utils/model/model.js'
import { getSettings_DEPRECATED } from '../utils/settings/settings.js'
import { ANSI_RESET, ansiRgb } from '../utils/terminalAnsi.js'
import {
  getTersaCaveStatusRows,
  resolveStartupProviderDetails,
} from '../utils/tersaStatus.js'
import {
  resolveLogoPalette,
  type RGB,
} from './StartupScreen.palettes.js'
import { renderResponsiveStartup } from './startup/renderResponsiveStartup.js'

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function gradAt(stops: readonly RGB[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t))
  const scaled = clamped * (stops.length - 1)
  const index = Math.floor(scaled)
  if (index >= stops.length - 1) return stops[stops.length - 1]!
  return lerp(stops[index]!, stops[index + 1]!, scaled - index)
}

export function paintLine(
  text: string,
  stops: readonly RGB[],
  lineT: number,
): string {
  let output = ''
  for (let index = 0; index < text.length; index += 1) {
    const position =
      text.length > 1
        ? lineT * 0.5 + (index / (text.length - 1)) * 0.5
        : lineT
    const [red, green, blue] = gradAt(stops, position)
    output += `${ansiRgb(red, green, blue)}${text[index]}`
  }
  return `${output}${ANSI_RESET}`
}

export function detectProvider(modelOverride?: string): {
  name: string
  model: string
  baseUrl: string
  isLocal: boolean
} {
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

export function renderStartupLines(
  modelOverride: string | undefined,
  columns: number,
  rows: number,
): string[] {
  const palette = resolveLogoPalette(getGlobalConfig().logoColor)
  return renderResponsiveStartup({
    columns,
    rows,
    version: MACRO.DISPLAY_VERSION ?? MACRO.VERSION,
    provider: detectProvider(modelOverride),
    caveRows: getTersaCaveStatusRows(),
    palette,
    paintLine,
  })
}

export function printStartupScreen(modelOverride?: string): void {
  if (process.env.CI || !process.stdout.isTTY) return

  const lines = renderStartupLines(
    modelOverride,
    process.stdout.columns ?? 80,
    process.stdout.rows ?? 24,
  )
  process.stdout.write('[2J[3J[H')
  process.stdout.write(`${lines.join('
')}
`)
}
