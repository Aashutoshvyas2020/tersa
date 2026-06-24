import { getCaveModeConfig } from './caveMode/config.js'
import { getTersaModeStatusRows } from './modes/config.js'
import type { TersaModesSettings } from './modes/types.js'
import { getAPIProvider } from './model/providers.js'
import { isLocalProviderUrl, resolveProviderRequest } from '../services/api/providerConfig.js'
import { getRouteLabel, isMiniMaxBaseUrl, resolveRouteIdFromBaseUrl } from '../integrations/routeMetadata.js'
import { getLocalOpenAICompatibleProviderLabel } from './providerDiscovery.js'
import { DEFAULT_GEMINI_MODEL } from './providerProfile.js'

export type TersaProviderStatus = {
  name: string
  baseUrl: string
  isLocal: boolean
}

export function resolveTersaProviderStatus(modelOverride?: string): TersaProviderStatus {
  const useGemini =
    process.env.CLAUDE_CODE_USE_GEMINI === '1' ||
    process.env.CLAUDE_CODE_USE_GEMINI === 'true'
  const useGithub =
    process.env.CLAUDE_CODE_USE_GITHUB === '1' ||
    process.env.CLAUDE_CODE_USE_GITHUB === 'true'
  const useOpenAI =
    process.env.CLAUDE_CODE_USE_OPENAI === '1' ||
    process.env.CLAUDE_CODE_USE_OPENAI === 'true'
  const useMistral =
    process.env.CLAUDE_CODE_USE_MISTRAL === '1' ||
    process.env.CLAUDE_CODE_USE_MISTRAL === 'true'

  if (useGemini) {
    const baseUrl =
      process.env.GEMINI_BASE_URL ??
      'https://generativelanguage.googleapis.com/v1beta/openai'
    return { name: 'Google Gemini', baseUrl, isLocal: false }
  }

  if (useMistral) {
    const baseUrl = process.env.MISTRAL_BASE_URL ?? 'https://api.mistral.ai/v1'
    return { name: 'Mistral', baseUrl, isLocal: false }
  }

  if (useGithub) {
    const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.githubcopilot.com'
    return { name: 'GitHub Copilot', baseUrl, isLocal: false }
  }

  if (useOpenAI) {
    const rawModel = modelOverride || process.env.OPENAI_MODEL || 'gpt-4o'
    const resolvedRequest = resolveProviderRequest({
      model: rawModel,
      baseUrl: process.env.OPENAI_BASE_URL,
    })
    const baseUrl = resolvedRequest.baseUrl
    const isLocal = isLocalProviderUrl(baseUrl)
    const routeId = resolveRouteIdFromBaseUrl(baseUrl)
    let name = 'OpenAI'

    if (process.env.NVIDIA_NIM) name = 'NVIDIA NIM'
    else if (process.env.MINIMAX_API_KEY) name = 'MiniMax'
    else if (
      resolvedRequest.transport === 'codex_responses' ||
      getAPIProvider() === 'codex' ||
      baseUrl.includes('chatgpt.com/backend-api/codex')
    )
      name = 'Codex'
    else if (/openrouter/i.test(baseUrl)) name = 'OpenRouter'
    else if (/together/i.test(baseUrl)) name = 'Together AI'
    else if (/groq/i.test(baseUrl)) name = 'Groq'
    else if (/azure/i.test(baseUrl)) name = 'Azure OpenAI'
    else if (/nvidia/i.test(baseUrl)) name = 'NVIDIA NIM'
    else if (/minimax/i.test(baseUrl)) name = 'MiniMax'
    else if (/api\.kimi\.com/i.test(baseUrl)) name = 'Moonshot AI - Kimi Code'
    else if (routeId && routeId !== 'openai' && routeId !== 'custom')
      name = getRouteLabel(routeId) ?? name
    else if (/moonshot/i.test(baseUrl)) name = 'Moonshot AI - API'
    else if (/deepseek/i.test(baseUrl)) name = 'DeepSeek'
    else if (/mistral/i.test(baseUrl)) name = 'Mistral'
    else if (/bankr/i.test(baseUrl)) name = 'Bankr'
    else if (isLocal) name = getLocalOpenAICompatibleProviderLabel(baseUrl)
    else if (/nvidia/i.test(rawModel)) name = 'NVIDIA NIM'
    else if (/minimax/i.test(rawModel)) name = 'MiniMax'
    else if (/\bkimi-for-coding\b/i.test(rawModel))
      name = 'Moonshot AI - Kimi Code'
    else if (/\bkimi-k/i.test(rawModel) || /moonshot/i.test(rawModel))
      name = 'Moonshot AI - API'
    else if (/deepseek/i.test(rawModel)) name = 'DeepSeek'
    else if (/mistral/i.test(rawModel)) name = 'Mistral'
    else if (/llama/i.test(rawModel)) name = 'Meta Llama'
    else if (/bankr/i.test(rawModel)) name = 'Bankr'

    return { name, baseUrl, isLocal }
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
  const isLocal = isLocalProviderUrl(baseUrl)
  const name = isMiniMaxBaseUrl(baseUrl) ? 'MiniMax' : 'Anthropic'
  return { name, baseUrl, isLocal }
}

export function resolveStartupProviderDetails(modelOverride?: string): {
  name: string
  model: string
  baseUrl: string
  isLocal: boolean
} {
  const provider = resolveTersaProviderStatus(modelOverride)
  const useGemini =
    process.env.CLAUDE_CODE_USE_GEMINI === '1' ||
    process.env.CLAUDE_CODE_USE_GEMINI === 'true'
  const useMistral =
    process.env.CLAUDE_CODE_USE_MISTRAL === '1' ||
    process.env.CLAUDE_CODE_USE_MISTRAL === 'true'

  if (useGemini) {
    return {
      ...provider,
      model: modelOverride || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    }
  }

  if (useMistral) {
    return {
      ...provider,
      model: modelOverride || process.env.MISTRAL_MODEL || 'devstral-latest',
    }
  }

  return {
    ...provider,
    model: modelOverride || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'default',
  }
}

function normalizeSkillCompressionStyleForDisplay(
  style: string | undefined,
): string {
  if (style === 'wenyan-lite') return 'lite'
  if (style === 'wenyan-full') return 'full'
  return style ?? 'full'
}

export function getTersaCaveStatusRows(): Array<[string, string]> {
  const config = getCaveModeConfig()
  const onOff = (value: boolean) => (value ? 'on' : 'off')
  return [
    ['Mode', config.enabled ? config.intensity : 'off'],
    ['Tool', onOff(config.toolCompression)],
    ['Struct', onOff(config.structuredCompression)],
    ['Dedup', onOff(config.readDeduplication)],
    ['History', onOff(config.softHistoryCompression)],
    ['RTK', onOff(config.rtkRewrite)],
    ['Repo', onOff(config.repoMapInjection)],
    ['Memory', onOff(config.memoryRecallInjection)],
    [
      'Skill',
      config.skillPromptCompression
        ? normalizeSkillCompressionStyleForDisplay(
            config.skillPromptCompressionStyle,
          )
        : 'off',
    ],
    ['ML', onOff(config.mlCompression)],
    [
      'Sidecar',
      config.mlCompression
        ? config.mlCompressionCommand?.trim()
          ? 'configured'
          : 'unset'
        : 'off',
    ],
  ]
}

export function getTersaOptimizationStatusRows(
  modeSettings?: TersaModesSettings,
): Array<[string, string]> {
  return [...getTersaCaveStatusRows(), ...getTersaModeStatusRows(modeSettings)]
}
