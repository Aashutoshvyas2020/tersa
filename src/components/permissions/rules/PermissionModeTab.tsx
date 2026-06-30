import { useEffect } from 'react'
import { Select } from '../../../components/CustomSelect/select.js'
import { Box, Text } from '../../../ink.js'
import type { ToolPermissionContext } from '../../../Tool.js'
import { useTabHeaderFocus } from '../../design-system/Tabs.js'
import {
  getPermissionModeOptions,
  isManageablePermissionMode,
  type ManageablePermissionMode,
  type PermissionModeOptionValue,
} from './permissionModeOptions.js'

type Props = {
  toolPermissionContext: ToolPermissionContext
  onSelectMode: (mode: ManageablePermissionMode) => void
  onCancel: () => void
  onHeaderFocusChange?: (focused: boolean) => void
  statusMessage?: string
}

export function PermissionModeTab({
  toolPermissionContext,
  onSelectMode,
  onCancel,
  onHeaderFocusChange,
  statusMessage,
}: Props) {
  const { headerFocused, focusHeader } = useTabHeaderFocus()

  useEffect(() => {
    onHeaderFocusChange?.(headerFocused)
  }, [headerFocused, onHeaderFocusChange])

  const options = getPermissionModeOptions(toolPermissionContext)
  const currentMode = options.some(
    option => option.value === toolPermissionContext.mode,
  )
    ? (toolPermissionContext.mode as PermissionModeOptionValue)
    : undefined
  const handleSelect = (value: PermissionModeOptionValue) => {
    if (isManageablePermissionMode(value)) onSelectMode(value)
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1} gap={1}>
        <Text>Change the current session permission mode.</Text>
        <Text dimColor={true} wrap="wrap">
          Standard modes keep safety boundaries intact. Elevated access is
          labeled explicitly and always opens a separate confirmation before it
          changes this session.
        </Text>
        {statusMessage ? <Text color="error">{statusMessage}</Text> : null}
      </Box>
      <Select
        options={options}
        onChange={handleSelect}
        onCancel={onCancel}
        visibleOptionCount={Math.min(12, options.length)}
        layout="compact-vertical"
        defaultFocusValue={currentMode}
        onUpFromFirstItem={focusHeader}
        isDisabled={headerFocused}
      />
    </Box>
  )
}
