import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { useAppState } from '../../state/AppState.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { truncate } from '../../utils/format.js'
import { getDisplayedEffortLevel } from '../../utils/effort.js'
import { renderModelSetting } from '../../utils/model/model.js'
import {
  getTersaOptimizationStatusRows,
  resolveTersaProviderStatus,
} from '../../utils/tersaStatus.js'

type Props = {
  compact?: boolean
  width?: number
}

function row(label: string, value: string, labelWidth = 8) {
  return (
    <Text wrap="truncate-end">
      <Text color="inactive">{label.padEnd(labelWidth)}</Text>
      <Text color="inactive">· </Text>
      <Text color="text">{value}</Text>
    </Text>
  )
}

function pairRow(
  left: readonly [string, string] | undefined,
  right: readonly [string, string] | undefined,
  columnWidth = 22,
) {
  const renderCell = (cell: readonly [string, string] | undefined) => (
    <Box width={columnWidth}>
      {cell ? (
        <Text wrap="truncate-end">
          <Text color="inactive">{cell[0].padEnd(8)}</Text>
          <Text color="inactive">· </Text>
          <Text color="text">{cell[1]}</Text>
        </Text>
      ) : null}
    </Box>
  )

  return (
    <Box flexDirection="row">
      {renderCell(left)}
      {right ? <Text color="inactive">│ </Text> : null}
      {renderCell(right)}
    </Box>
  )
}

export function TersaRuntimePanels({ compact = false, width = 64 }: Props) {
  const effortValue = useAppState(s => s.effortValue)
  const modeSettings = useAppState(s => s.settings.modes)
  const model = useMainLoopModel()
  void modeSettings
  const provider = resolveTersaProviderStatus(model ?? undefined)
  const modelLabel = renderModelSetting(model)
  const displayedEffort =
    effortValue === undefined
      ? 'auto'
      : getDisplayedEffortLevel(model, effortValue)
  const panelWidth = Math.max(42, Math.min(width, compact ? 78 : 96))
  const boxWidth = compact ? panelWidth : Math.floor((panelWidth - 2) / 2)
  const innerWidth = Math.max(20, boxWidth - 15)
  const providerRows = [
    ['Provider', provider.name],
    ['Model', truncate(modelLabel, innerWidth)],
    ['Effort', displayedEffort],
    ['Endpoint', truncate(provider.baseUrl, innerWidth)],
  ] as const
  const optimizationRows = getTersaOptimizationStatusRows()
  const optimizationPairs = []
  const optimizationColumnWidth = Math.max(
    20,
    Math.floor((boxWidth - 6) / 2),
  )
  for (let i = 0; i < optimizationRows.length; i += 2) {
    optimizationPairs.push([optimizationRows[i], optimizationRows[i + 1]] as const)
  }

  return (
    <Box flexDirection={compact ? 'column' : 'row'} gap={1} width={panelWidth}>
      <Box borderStyle="round" borderColor="inactive" paddingX={1} flexDirection="column" width={boxWidth}>
        <Text color="inactive">Runtime</Text>
        {providerRows.map(([label, value]) => (
          <React.Fragment key={label}>{row(label, value, 9)}</React.Fragment>
        ))}
      </Box>
      <Box borderStyle="round" borderColor="inactive" paddingX={1} flexDirection="column" width={boxWidth}>
        <Text color="inactive">Optimize</Text>
        {optimizationPairs.map(([left, right]) => (
          <React.Fragment key={left?.[0] ?? 'empty'}>
            {pairRow(left, right, optimizationColumnWidth)}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  )
}
