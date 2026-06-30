import {
  isDollarInvocableCommand,
  type Command,
  type PromptCommand,
} from '../commands.js'
import type { SettingSource } from './settings/constants.js'

export type SkillCommand = Command & PromptCommand
export type SkillSourceGroup =
  | SettingSource
  | 'plugin'
  | 'mcp'
  | 'bundled'
  | 'managed'

export const SKILL_SOURCE_GROUP_ORDER: readonly SkillSourceGroup[] = [
  'projectSettings',
  'localSettings',
  'userSettings',
  'policySettings',
  'managed',
  'plugin',
  'mcp',
  'bundled',
  'flagSettings',
]

export function getVisibleSkillCommands(commands: Command[]): SkillCommand[] {
  return commands.filter(isDollarInvocableCommand) as SkillCommand[]
}

export function getSkillSourceGroup(skill: SkillCommand): SkillSourceGroup {
  if (skill.loadedFrom === 'managed') return 'managed'
  if (skill.loadedFrom === 'bundled' || skill.source === 'bundled') {
    return 'bundled'
  }
  if (skill.source === 'plugin' || skill.loadedFrom === 'plugin') {
    return 'plugin'
  }
  if (skill.source === 'mcp' || skill.isMcp || skill.loadedFrom === 'mcp') {
    return 'mcp'
  }

  return skill.source as SettingSource
}
