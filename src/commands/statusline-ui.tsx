import * as React from 'react'
import { useSetAppState } from '../state/AppState.js'
import type { LocalJSXCommandCall } from '../types/command.js'
import type { BuiltinStatusLineConfig } from '../types/statusLine.js'
import { updateSettingsForSource } from '../utils/settings/settings.js'
import {
  StatusLineConfigDialog,
} from '../components/statusline/StatusLineConfigDialog.js'
import {
  getDefaultBuiltinStatusLineConfig,
  normalizeBuiltinStatusLineConfig,
} from '../components/statusline/statusLineConfig.js'

function DisableStatusLine({
  onDone,
}: {
  onDone: Parameters<LocalJSXCommandCall>[0]
}) {
  const setAppState = useSetAppState()

  React.useEffect(() => {
    const result = updateSettingsForSource('userSettings', {
      statusLine: undefined,
    })
    if (result.error) {
      onDone(`Failed to disable status line: ${result.error.message}`, {
        display: 'system',
      })
      return
    }

    setAppState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        statusLine: undefined,
      },
      statusLineText: undefined,
    }))

    onDone('Status line disabled', { display: 'system' })
  }, [onDone, setAppState])

  return null
}

function StatusLineDialogWrapper({
  onDone,
  initialConfig,
}: {
  onDone: Parameters<LocalJSXCommandCall>[0]
  initialConfig: BuiltinStatusLineConfig
}) {
  const setAppState = useSetAppState()

  const handleCancel = React.useCallback(() => {
    onDone('Status line dialog dismissed', { display: 'system' })
  }, [onDone])

  const handleSave = React.useCallback(
    (config: BuiltinStatusLineConfig) => {
      const nextStatusLine = normalizeBuiltinStatusLineConfig(config)
      const result = updateSettingsForSource('userSettings', {
        statusLine: nextStatusLine,
      })
      if (result.error) {
        onDone(`Failed to save status line: ${result.error.message}`, {
          display: 'system',
        })
        return
      }

      setAppState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          statusLine: nextStatusLine,
        },
        statusLineText: nextStatusLine ? prev.statusLineText : undefined,
      }))

      onDone(
        nextStatusLine.enabled === false
          ? 'Status line disabled'
          : 'Status line updated',
        {
        display: 'system',
        },
      )
    },
    [onDone, setAppState],
  )

  return (
    <StatusLineConfigDialog
      defaultConfig={initialConfig}
      onCancel={handleCancel}
      onSave={handleSave}
    />
  )
}

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const normalized = (args ?? '').trim().toLowerCase()
  if (normalized === 'off' || normalized === 'disable') {
    return <DisableStatusLine onDone={onDone} />
  }

  const current = context.getAppState().settings.statusLine
  const initialConfig =
    current?.type === 'builtin' ? current : getDefaultBuiltinStatusLineConfig()

  return <StatusLineDialogWrapper onDone={onDone} initialConfig={initialConfig} />
}
