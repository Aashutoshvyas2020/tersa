import * as React from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { Box } from '../../ink.js'
import {
  getResponsiveWidth,
  shouldStackResponsiveRow,
} from './responsiveLayout.js'

type Props = {
  children: React.ReactNode
  availableWidth?: number
  stackBelow?: number
  gap?: number
  width?: number | '100%'
  flexGrow?: number
}

export function ResponsiveRow({
  children,
  availableWidth,
  stackBelow = 60,
  gap = 1,
  width = '100%',
  flexGrow,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const resolvedWidth = getResponsiveWidth({
    terminalWidth: columns,
    availableWidth,
  })
  const stacked = shouldStackResponsiveRow(resolvedWidth, stackBelow)

  return (
    <Box
      width={width}
      flexGrow={flexGrow}
      flexDirection={stacked ? 'column' : 'row'}
      flexWrap="wrap"
      columnGap={gap}
      rowGap={stacked ? 0 : gap}
      alignItems="flex-start"
    >
      {children}
    </Box>
  )
}
