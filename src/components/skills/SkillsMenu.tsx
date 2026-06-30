import * as React from 'react'
import type { Command, CommandResultDisplay } from '../../commands.js'
import { Box, Text } from '../../ink.js'
import {
  estimateSkillFrontmatterTokens,
  getSkillsPath,
} from '../../skills/loadSkillsDir.js'
import { getDisplayPath } from '../../utils/file.js'
import { formatTokens } from '../../utils/format.js'
import {
  getSettingSourceName,
  type SettingSource,
} from '../../utils/settings/constants.js'
import {
  getSkillSourceGroup,
  getVisibleSkillCommands,
  SKILL_SOURCE_GROUP_ORDER,
  type SkillCommand,
  type SkillSourceGroup,
} from '../../utils/skillsInventory.js'
import { plural } from '../../utils/stringUtils.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Dialog } from '../design-system/Dialog.js'
import FullWidthRow from '../design-system/FullWidthRow.js'

type Props = {
  onExit: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  commands: Command[]
}

function titleCase(value: string): string {
  return value.length === 0 ? value : `${value[0]?.toUpperCase()}${value.slice(1)}`
}

function getSourceTitle(source: SkillSourceGroup): string {
  switch (source) {
    case 'plugin':
      return 'Plugin skills'
    case 'mcp':
      return 'MCP skills'
    case 'bundled':
      return 'Bundled skills'
    case 'managed':
      return 'Managed skills'
    default:
      return `${titleCase(getSettingSourceName(source))} skills`
  }
}

function getSourceSubtitle(
  source: SkillSourceGroup,
  skills: SkillCommand[],
): string | undefined {
  if (source === 'mcp') {
    const servers = [
      ...new Set(
        skills
          .map(skill => {
            const separator = skill.name.indexOf(':')
            return separator > 0 ? skill.name.slice(0, separator) : null
          })
          .filter((name): name is string => name !== null),
      ),
    ]
    return servers.length > 0 ? servers.join(', ') : undefined
  }

  if (source === 'bundled') return 'Included with Tersa'
  if (source === 'managed') return 'Managed by your organization'

  if (source === 'plugin') {
    const plugins = [
      ...new Set(
        skills
          .map(skill => skill.pluginInfo?.pluginManifest.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ]
    return plugins.length > 0 ? plugins.join(', ') : undefined
  }

  const skillsPath = getDisplayPath(
    getSkillsPath(source as SettingSource, 'skills'),
  )
  const hasDeprecatedCommands = skills.some(
    skill => skill.loadedFrom === 'commands_DEPRECATED',
  )
  return hasDeprecatedCommands
    ? `${skillsPath}, ${getDisplayPath(
        getSkillsPath(source as SettingSource, 'commands'),
      )}`
    : skillsPath
}

function getSkillListLabel(skill: SkillCommand): string {
  const leafName = skill.name.split(':').pop() ?? skill.name
  return leafName === skill.name ? skill.name : `${skill.name} - ${leafName}`
}

function SkillRow({ skill }: { skill: SkillCommand }): React.ReactNode {
  const estimatedTokens = estimateSkillFrontmatterTokens(skill)
  const pluginName =
    skill.source === 'plugin'
      ? skill.pluginInfo?.pluginManifest.name
      : undefined

  return (
    <FullWidthRow>
      <Text>{getSkillListLabel(skill)}</Text>
      <Text dimColor>
        {pluginName ? ` · ${pluginName}` : ''} · ~{formatTokens(estimatedTokens)}{' '}
        description tokens
      </Text>
    </FullWidthRow>
  )
}

export function SkillsMenu({ onExit, commands }: Props): React.ReactNode {
  const skills = React.useMemo(
    () => getVisibleSkillCommands(commands),
    [commands],
  )
  const skillsBySource = React.useMemo(() => {
    const groups = new Map<SkillSourceGroup, SkillCommand[]>()
    for (const source of SKILL_SOURCE_GROUP_ORDER) groups.set(source, [])

    for (const skill of skills) {
      const source = getSkillSourceGroup(skill)
      const group = groups.get(source)
      if (group) group.push(skill)
      else groups.set(source, [skill])
    }

    for (const group of groups.values()) {
      group.sort((a, b) => a.name.localeCompare(b.name))
    }
    return groups
  }, [skills])

  const handleCancel = React.useCallback(() => {
    onExit('Skills dialog dismissed', { display: 'system' })
  }, [onExit])

  const closeHint = (
    <FullWidthRow>
      <Text dimColor italic>
        <ConfigurableShortcutHint
          action="confirm:no"
          context="Confirmation"
          fallback="Esc"
          description="close"
        />
      </Text>
    </FullWidthRow>
  )

  if (skills.length === 0) {
    return (
      <Dialog
        title="Skills"
        subtitle="No invocable skills found"
        onCancel={handleCancel}
        hideInputGuide
      >
        <FullWidthRow>
          <Text dimColor>
            Create a skill in ~/.tersa/skills/&lt;name&gt;/SKILL.md or a project
            compatibility .claude/skills directory.
          </Text>
        </FullWidthRow>
        {closeHint}
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Skills"
      subtitle={`${skills.length} ${plural(skills.length, 'skill')}`}
      onCancel={handleCancel}
      hideInputGuide
    >
      <Box flexDirection="column" gap={1}>
        {SKILL_SOURCE_GROUP_ORDER.map(source => {
          const group = skillsBySource.get(source) ?? []
          if (group.length === 0) return null
          const subtitle = getSourceSubtitle(source, group)
          return (
            <Box flexDirection="column" key={source}>
              <FullWidthRow>
                <Text bold dimColor>
                  {getSourceTitle(source)}
                </Text>
                {subtitle ? <Text dimColor> ({subtitle})</Text> : null}
              </FullWidthRow>
              {group.map(skill => (
                <SkillRow
                  key={`${skill.name}-${getSkillSourceGroup(skill)}`}
                  skill={skill}
                />
              ))}
            </Box>
          )
        })}
      </Box>
      {closeHint}
    </Dialog>
  )
}
