import type { AgentColorName } from '../../../tools/AgentTool/agentColorManager.js'
import type { AgentMemoryScope } from '../../../tools/AgentTool/agentMemory.js'
import type { CustomAgentDefinition } from '../../../tools/AgentTool/loadAgentsDir.js'
import type { SettingSource } from '../../../utils/settings/constants.js'
import type { GeneratedAgent } from '../generateAgent.js'

export type AgentCreationSource = Extract<
  SettingSource,
  'userSettings' | 'projectSettings'
>

export type AgentWizardData = {
  location?: AgentCreationSource
  generationPrompt?: string
  generatedAgent?: GeneratedAgent
  isGenerating?: boolean
  method?: 'generate' | 'manual'
  wasGenerated?: boolean
  agentType?: string
  systemPrompt?: string
  whenToUse?: string
  selectedTools?: string[]
  selectedModel?: string
  selectedColor?: AgentColorName
  selectedMemory?: AgentMemoryScope
  finalAgent?: CustomAgentDefinition
}
