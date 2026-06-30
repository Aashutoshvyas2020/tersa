import { feature } from 'bun:bundle'

import type { OptionWithDescription } from '../../../components/CustomSelect/select.js'
import type { ToolPermissionContext } from '../../../Tool.js'
import type { PermissionMode } from '../../../utils/permissions/PermissionMode.js'
import { permissionModeTitle } from '../../../utils/permissions/PermissionMode.js'

export type ManageablePermissionMode = Extract<
  PermissionMode,
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'auto'
  | 'bypassPermissions'
  | 'fullAccess'
>

export type PermissionModeOptionValue =
  | ManageablePermissionMode
  | '__standard_modes'
  | '__elevated_modes'

const MODE_DESCRIPTIONS: Record<ManageablePermissionMode, string> = {
  default:
    'Standard. Asks before edits, shell commands, network access, and other risky actions.',
  acceptEdits:
    'Standard. Workspace file edits are automatic; shell, network, and broader access still prompt.',
  plan: 'Standard. Read-only analysis; edits and command execution are blocked.',
  auto:
    'Standard. Uses classifier-driven approvals when available and still preserves safety boundaries.',
  bypassPermissions:
    'ELEVATED. Skips normal permission prompts for edits, shell, and network actions; hard safety prompts remain.',
  fullAccess:
    'ELEVATED · HIGHEST RISK. Skips normal prompts and hard safety-check prompts for this session.',
}

export function isElevatedPermissionMode(
  mode: PermissionMode,
): mode is Extract<PermissionMode, 'bypassPermissions' | 'fullAccess'> {
  return mode === 'bypassPermissions' || mode === 'fullAccess'
}

export function isManageablePermissionMode(
  value: PermissionModeOptionValue,
): value is ManageablePermissionMode {
  return value !== '__standard_modes' && value !== '__elevated_modes'
}

export function getManageablePermissionModes(
  context: ToolPermissionContext,
): ManageablePermissionMode[] {
  const modes: ManageablePermissionMode[] = ['default', 'acceptEdits', 'plan']

  if (
    feature('TRANSCRIPT_CLASSIFIER') &&
    (context.isAutoModeAvailable || context.mode === 'auto')
  ) {
    modes.push('auto')
  }

  modes.push('bypassPermissions', 'fullAccess')
  return modes
}

function modeOption(
  mode: ManageablePermissionMode,
  context: ToolPermissionContext,
): OptionWithDescription<PermissionModeOptionValue> {
  const current = mode === context.mode
  const elevated = isElevatedPermissionMode(mode)
  return {
    label: `${elevated ? '[ELEVATED] ' : ''}${permissionModeTitle(mode)}${
      current ? ' (current)' : ''
    }`,
    value: mode,
    description: MODE_DESCRIPTIONS[mode],
    color: elevated ? 'warning' : undefined,
  }
}

export function getPermissionModeOptions(
  context: ToolPermissionContext,
): OptionWithDescription<PermissionModeOptionValue>[] {
  const modes = getManageablePermissionModes(context)
  const standard = modes.filter(mode => !isElevatedPermissionMode(mode))
  const elevated = modes.filter(isElevatedPermissionMode)

  return [
    {
      label: 'STANDARD MODES',
      value: '__standard_modes',
      description: 'Prompted or read-only access with safety boundaries intact.',
      disabled: true,
    },
    ...standard.map(mode => modeOption(mode, context)),
    {
      label: 'ELEVATED ACCESS',
      value: '__elevated_modes',
      description:
        'Reduces or removes approval barriers. Selecting either mode opens a separate confirmation.',
      disabled: true,
      color: 'warning',
    },
    ...elevated.map(mode => modeOption(mode, context)),
  ]
}
