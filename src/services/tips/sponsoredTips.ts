import chalk from 'chalk'
import { color } from '../../components/design-system/color.js'
import type { Tip, TipContext, TipSponsor } from './types.js'

export function sponsoredTipsEnabled(): boolean {
  return false
}

export function getSponsoredTipsFrequency(): number {
  return 0
}

const ATOMIC: TipSponsor = {
  name: 'Atomic Chat',
  url: 'https://atomic.chat/',
}

const XIAOMI_MIMO: TipSponsor = {
  name: 'Xiaomi MiMo',
  url: 'https://api.xiaomimimo.com/v1',
}

function renderSponsoredTip(
  sponsor: TipSponsor,
  body: string,
  ctx: TipContext,
): string {
  const green = color('success', ctx.theme)
  const label = sponsor.label ?? 'Sponsored'
  const badge = green(`${label} · ${sponsor.name}`)
  const text = green(body)
  const url = sponsor.url ? ` ${chalk.dim(sponsor.url)}` : ''
  return `${badge} — ${text}${url}`
}

export const sponsoredTips: Tip[] = [
  {
    id: 'atomic-setup-local',
    sponsor: ATOMIC,
    content: async ctx =>
      renderSponsoredTip(
        ATOMIC,
        'Setup free local models with Atomic Chat',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'atomic-free-access',
    sponsor: ATOMIC,
    content: async ctx =>
      renderSponsoredTip(
        ATOMIC,
        'Atomic Chat local models give you free access to Tersa',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'atomic-turboquant-context',
    sponsor: ATOMIC,
    content: async ctx =>
      renderSponsoredTip(
        ATOMIC,
        'Increase your context window with TurboQuant in Atomic Chat local models',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'atomic-ram-savings',
    sponsor: ATOMIC,
    content: async ctx =>
      renderSponsoredTip(
        ATOMIC,
        '30% less RAM usage with Atomic Chat local models',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'xiaomi-mimo-context-window',
    sponsor: XIAOMI_MIMO,
    content: async ctx =>
      renderSponsoredTip(
        XIAOMI_MIMO,
        'Increase your context window with Xiaomi MiMo',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'xiaomi-mimo-coding-benchmarks',
    sponsor: XIAOMI_MIMO,
    content: async ctx =>
      renderSponsoredTip(
        XIAOMI_MIMO,
        'MiMo performs well on coding benchmarks',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'xiaomi-mimo-hugging-face-ranking',
    sponsor: XIAOMI_MIMO,
    content: async ctx =>
      renderSponsoredTip(
        XIAOMI_MIMO,
        'Hugging Face shows MiMo among top coding models',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'xiaomi-mimo-compatible-tools',
    sponsor: XIAOMI_MIMO,
    content: async ctx =>
      renderSponsoredTip(
        XIAOMI_MIMO,
        'You can switch to Xiaomi MiMo in compatible tools',
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
  {
    id: 'xiaomi-mimo-real-problems',
    sponsor: XIAOMI_MIMO,
    content: async ctx =>
      renderSponsoredTip(
        XIAOMI_MIMO,
        "MiMo's true value: efficiently solving developers' real problems",
        ctx,
      ),
    cooldownSessions: 20,
    isRelevant: async () => sponsoredTipsEnabled(),
  },
]
