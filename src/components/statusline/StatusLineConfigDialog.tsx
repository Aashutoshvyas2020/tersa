import * as React from 'react'
import { Box, Text, useInput } from '../../ink.js'
import { Dialog } from '../design-system/Dialog.js'
import type { ExitState } from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import type {
  BuiltinStatusLineColorIntensity,
  BuiltinStatusLineConfig,
  BuiltinStatusLineTokenDetail,
} from '../../types/statusLine.js'
import {
  cycleBuiltinStatusLineChoice,
  getDefaultBuiltinStatusLineConfig,
  normalizeBuiltinStatusLineConfig,
  toggleBuiltinStatusLineBoolean,
} from './statusLineConfig.js'

type Props = {
  defaultConfig: BuiltinStatusLineConfig
  onCancel: () => void
  onSave: (config: BuiltinStatusLineConfig) => void
}

type BooleanKey =
  | 'enabled'
  | 'showProviderModelEffort'
  | 'showProjectDirectory'
  | 'showGit'
  | 'showPermissions'
  | 'showPlanGoalMode'
  | 'showMcp'
  | 'showBackgroundTasks'
  | 'showWarnings'
  | 'showIdeContext'
  | 'showTokenPercentage'
  | 'estimatedMarker'

type Row =
  | {
      kind: 'boolean'
      key: BooleanKey
      label: string
    }
  | {
      kind: 'choice'
      key: 'tokenDetail' | 'colorIntensity'
      label: string
      value: BuiltinStatusLineTokenDetail | BuiltinStatusLineColorIntensity
    }
  | {
      kind: 'action'
      key: 'reset'
      label: string
    }

function renderInputGuide(exitState: ExitState): React.ReactNode {
  if (exitState.pending) {
    return <Text>Press {exitState.keyName} again to exit</Text>
  }

  return (
    <Text dimColor>
      Space toggle · ←→ cycle · Enter save · R reset ·{' '}
      <Text>{exitState.keyName}</Text> cancel
    </Text>
  )
}

function renderToggle(value: boolean): string {
  return value ? '[x]' : '[ ]'
}

function buildRows(
  config: BuiltinStatusLineConfig,
): Array<Row & { valueText?: string }> {
  return [
    { kind: 'boolean', key: 'enabled', label: 'Enabled' },
    {
      kind: 'boolean',
      key: 'showProviderModelEffort',
      label: 'Provider / model / effort',
    },
    { kind: 'boolean', key: 'showProjectDirectory', label: 'Project / directory' },
    { kind: 'boolean', key: 'showGit', label: 'Git' },
    { kind: 'boolean', key: 'showPermissions', label: 'Permissions' },
    { kind: 'boolean', key: 'showPlanGoalMode', label: 'Plan / goal mode' },
    { kind: 'boolean', key: 'showMcp', label: 'MCP' },
    { kind: 'boolean', key: 'showBackgroundTasks', label: 'Background tasks' },
    { kind: 'boolean', key: 'showWarnings', label: 'Warnings' },
    { kind: 'boolean', key: 'showIdeContext', label: 'IDE context' },
    { kind: 'boolean', key: 'showTokenPercentage', label: 'Token percentage' },
    {
      kind: 'choice',
      key: 'tokenDetail',
      label: 'Token detail',
      value: config.tokenDetail ?? 'compact',
    },
    { kind: 'boolean', key: 'estimatedMarker', label: 'Estimated marker' },
    {
      kind: 'choice',
      key: 'colorIntensity',
      label: 'Color intensity',
      value: config.colorIntensity ?? 'normal',
    },
    { kind: 'action', key: 'reset', label: 'Reset to defaults' },
  ]
}

export function StatusLineConfigDialog({
  defaultConfig,
  onCancel,
  onSave,
}: Props) {
  const [draft, setDraft] = React.useState<BuiltinStatusLineConfig>(() =>
    normalizeBuiltinStatusLineConfig(defaultConfig),
  )
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const rows = React.useMemo(() => buildRows(draft), [draft])

  React.useEffect(() => {
    setDraft(normalizeBuiltinStatusLineConfig(defaultConfig))
  }, [defaultConfig])

  const resetToDefaults = React.useCallback(() => {
    setDraft(getDefaultBuiltinStatusLineConfig())
  }, [])

  const save = React.useCallback(() => {
    onSave(normalizeBuiltinStatusLineConfig(draft))
  }, [draft, onSave])

  const mutateBoolean = React.useCallback(
    (key: BooleanKey) => {
      setDraft(current => toggleBuiltinStatusLineBoolean(current, key))
    },
    [],
  )

  const cycleChoice = React.useCallback(
    (key: 'tokenDetail' | 'colorIntensity', direction: -1 | 1) => {
      setDraft(current => cycleBuiltinStatusLineChoice(current, key, direction))
    },
    [],
  )

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel()
        return
      }

      if (key.upArrow) {
        setSelectedIndex(index => (index - 1 + rows.length) % rows.length)
        return
      }

      if (key.downArrow) {
        setSelectedIndex(index => (index + 1) % rows.length)
        return
      }

      const row = rows[selectedIndex]
      if (!row) {
        return
      }

      if (key.leftArrow) {
        if (row.kind === 'choice') {
          cycleChoice(row.key, -1)
        }
        return
      }

      if (key.rightArrow) {
        if (row.kind === 'choice') {
          cycleChoice(row.key, 1)
        }
        return
      }

      if (key.return) {
        save()
        return
      }

      if (input.toLowerCase() === 'r') {
        resetToDefaults()
        return
      }

      if (input === ' ') {
        if (row.kind === 'boolean') {
          mutateBoolean(row.key)
          return
        }
        if (row.kind === 'choice') {
          cycleChoice(row.key, 1)
          return
        }
        if (row.kind === 'action') {
          resetToDefaults()
        }
      }
    },
    { isActive: true },
  )

  return (
    <Dialog
      title="Status line"
      subtitle="Show the live session state beneath the prompt."
      onCancel={onCancel}
      inputGuide={renderInputGuide}
    >
      <Box flexDirection="column">
        {rows.map((row, index) => {
          const isFocused = index === selectedIndex
          const prefix = isFocused ? '❯' : ' '
          const isEnabled = draft.enabled !== false
          const rowDim = row.kind !== 'boolean' || row.key === 'enabled'
            ? false
            : !isEnabled
          const labelStyle = row.kind === 'action' ? 'warning' : 'text'
          const valueText =
            row.kind === 'boolean'
              ? renderToggle(Boolean(draft[row.key]))
              : row.kind === 'choice'
                ? row.value
                : 'R'

          return (
            <Box key={row.label} gap={1}>
              <Text dimColor={!isFocused}>{prefix}</Text>
              <Text dimColor={rowDim} bold={isFocused} color={labelStyle}>
                {row.label}
              </Text>
              <Text dimColor={rowDim}>·</Text>
              <Text
                dimColor={rowDim}
                color={row.kind === 'choice' ? 'suggestion' : undefined}
                bold={isFocused}
              >
                {valueText}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Dialog>
  )
}
