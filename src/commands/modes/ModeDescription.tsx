import type { ReactNode } from 'react'

import { Box, Text } from '../../ink.js'

export function ModeDescription({ children }: { children: ReactNode }) {
  return (
    <Box paddingLeft={4} paddingRight={1}>
      <Text dimColor={true} wrap="wrap">
        {children}
      </Text>
    </Box>
  )
}
