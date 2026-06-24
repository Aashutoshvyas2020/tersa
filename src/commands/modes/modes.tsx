import * as React from 'react'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text, useInput } from '../../ink.js'
import { useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { getTersaModesConfig } from '../../utils/modes/config.js'
import { listModeDefinitions } from '../../utils/modes/registry.js'
import type { TersaModeId, TersaModesSettings } from '../../utils/modes/types.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

export function toggleModeSetting(
  current: TersaModesSettings | undefined,
  id: TersaModeId,
): TersaModesSettings {
  const config = getTersaModesConfig(current)
  const currentMode = config.modes[id]
  const savedMode = current?.[id] ?? {}

  return {
    ...(current ?? {}),
    [id]: {
      ...savedMode,
      enabled: !currentMode.enabled,
      intensity: savedMode.intensity ?? currentMode.intensity ?? 'full',
    },
  }
}

function ModesCommand({
  onDone,
  current,
}: {
  onDone: Parameters<LocalJSXCommandCall>[0]
  current?: TersaModesSettings
}) {
  const setAppState = useSetAppState()
  const [draft, setDraft] = React.useState<TersaModesSettings>(current ?? {})
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const definitions = React.useMemo(() => listModeDefinitions(), [])
  const config = getTersaModesConfig(draft)

  const close = React.useCallback(() => {
    onDone('Modes updated', { display: 'system' })
  }, [onDone])

  const toggleSelected = React.useCallback(() => {
    const definition = definitions[selectedIndex]
    if (!definition) return

    const next = toggleModeSetting(draft, definition.id)
    const result = updateSettingsForSource('userSettings', {
      modes: next,
    } as any)
    if (result.error) {
      onDone(`Failed to update modes: ${result.error.message}`, {
        display: 'system',
      })
      return
    }

    setDraft(next)
    setAppState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        modes: next,
      },
    }))
  }, [definitions, draft, onDone, selectedIndex, setAppState])

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex(index => (index - 1 + definitions.length) % definitions.length)
        return
      }

      if (key.downArrow) {
        setSelectedIndex(index => (index + 1) % definitions.length)
        return
      }

      if (key.return || input === ' ') {
        toggleSelected()
      }
    },
    { isActive: true },
  )

  return (
    <Dialog
      title="Modes"
      subtitle={`Profile: ${config.profile}`}
      onCancel={close}
      color="permission"
      inputGuide={() => '↑/↓ select · Enter/Space toggle · Esc close'}
    >
      <Box flexDirection="column">
        {definitions.map((definition, index) => {
          const mode = config.modes[definition.id]
          const selected = index === selectedIndex
          return (
            <Box key={definition.id} flexDirection="column" marginBottom={1}>
              <Text bold={selected}>
                {selected ? '> ' : '  '}
                {mode.enabled ? '[on]  ' : '[off] '}
                {definition.label}
              </Text>
              <Text dimColor={true}>    {definition.description}</Text>
            </Box>
          )
        })}
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, context) => {
  return (
    <ModesCommand
      onDone={onDone}
      current={context.getAppState().settings.modes as TersaModesSettings | undefined}
    />
  )
}
