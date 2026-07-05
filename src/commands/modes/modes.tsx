import * as React from 'react'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text, useInput } from '../../ink.js'
import { useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { DEFAULT_CAVE_MODE_CONFIG } from '../../utils/caveMode/config.js'
import type { CaveModeConfig } from '../../utils/caveMode/types.js'
import { getTersaModesConfig } from '../../utils/modes/config.js'
import { listModeDefinitions } from '../../utils/modes/registry.js'
import type { TersaModesSettings, TersaPromptModeId } from '../../utils/modes/types.js'
import { ModeDescription } from './ModeDescription.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

export function toggleModeSetting(
  current: TersaModesSettings | undefined,
  id: TersaPromptModeId,
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

export function toggleCaveModeSetting(
  current: Partial<CaveModeConfig> | undefined,
): CaveModeConfig {
  const resolved = { ...DEFAULT_CAVE_MODE_CONFIG, ...(current ?? {}) }
  const enabled = resolved.enabled && resolved.intensity !== 'off'
  return {
    ...resolved,
    enabled: !enabled,
    intensity: !enabled && resolved.intensity === 'off' ? 'full' : resolved.intensity,
  }
}

export function finishModesCommand(
  onDone: Parameters<LocalJSXCommandCall>[0],
  changed: boolean,
): void {
  if (!changed) {
    onDone(undefined, { display: 'skip' })
    return
  }
  onDone('Modes updated', { display: 'system' })
}

function ModesCommand({
  onDone,
  current,
  currentCave,
}: {
  onDone: Parameters<LocalJSXCommandCall>[0]
  current?: TersaModesSettings
  currentCave?: Partial<CaveModeConfig>
}) {
  const setAppState = useSetAppState()
  const [draft, setDraft] = React.useState<TersaModesSettings>(current ?? {})
  const [draftCave, setDraftCave] = React.useState<Partial<CaveModeConfig>>(currentCave ?? {})
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [changed, setChanged] = React.useState(false)
  const definitions = React.useMemo(() => listModeDefinitions(), [])
  const config = getTersaModesConfig(draft)
  const caveMode = { ...DEFAULT_CAVE_MODE_CONFIG, ...draftCave }

  const close = React.useCallback(() => {
    finishModesCommand(onDone, changed)
  }, [changed, onDone])

  const toggleSelected = React.useCallback(() => {
    const definition = definitions[selectedIndex]
    if (!definition) return

    if (definition.id === 'cave') {
      const nextCave = toggleCaveModeSetting(draftCave)
      const result = updateSettingsForSource('userSettings', {
        caveMode: nextCave,
      } as any)
      if (result.error) {
        onDone(`Failed to update modes: ${result.error.message}`, {
          display: 'system',
        })
        return
      }

      setDraftCave(nextCave)
      setChanged(true)
      setAppState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          caveMode: nextCave,
        },
      }))
      return
    }

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
    setChanged(true)
    setAppState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        modes: next,
      },
    }))
  }, [definitions, draft, draftCave, onDone, selectedIndex, setAppState])

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
          const mode =
            definition.id === 'cave'
              ? {
                  enabled: caveMode.enabled && caveMode.intensity !== 'off',
                  intensity: caveMode.intensity,
                }
              : config.modes[definition.id]
          const selected = index === selectedIndex
          return (
            <Box key={definition.id} flexDirection="column" marginBottom={1}>
              <Text bold={selected}>
                {selected ? '> ' : '  '}
                {mode.enabled ? '[on]  ' : '[off] '}
                {definition.label} · {mode.intensity}
              </Text>
              <ModeDescription>{definition.description}</ModeDescription>
            </Box>
          )
        })}
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const settings = context.getAppState().settings
  return (
    <ModesCommand
      onDone={onDone}
      current={settings.modes as TersaModesSettings | undefined}
      currentCave={settings.caveMode}
    />
  )
}
