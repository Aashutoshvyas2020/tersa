import * as React from 'react'
import { Box } from '../../ink.js'
import { ResponsiveRow } from './ResponsiveRow.js'

type Props = {
  children: React.ReactNode
  availableWidth?: number
  stackBelow?: number
  gap?: number
}

export default function FullWidthRow({
  children,
  availableWidth,
  stackBelow = 60,
  gap = 1,
}: Props): React.ReactNode {
  return (
    <ResponsiveRow
      availableWidth={availableWidth}
      stackBelow={stackBelow}
      gap={gap}
    >
      {children}
      <Box flexGrow={1} />
    </ResponsiveRow>
  )
}
