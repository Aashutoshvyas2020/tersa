import React from 'react'
import { Box, Text } from '../ink.js'
import { Select } from './CustomSelect/index.js'
import { Dialog } from './design-system/Dialog.js'

type Props = {
  modelLabel: string
  consecutiveMisses: number
  onCompact: () => void | Promise<void>
  onIgnore: () => void
  onSuppressForSession: () => void
}

export function SessionDriftWarningDialog({
  modelLabel,
  consecutiveMisses,
  onCompact,
  onIgnore,
  onSuppressForSession,
}: Props): React.ReactNode {
  return (
    <Dialog
      title={<Text color="error">Session drift detected</Text>}
      onCancel={onIgnore}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          {modelLabel} has stopped following a persistent session instruction.
        </Text>
        <Text dimColor>
          Long sessions can become less reliable as context grows.
        </Text>
        <Text dimColor>Consecutive misses: {consecutiveMisses}</Text>
      </Box>
      <Select
        options={[
          {
            value: 'compact',
            label: 'Compact context',
          },
          {
            value: 'ignore',
            label: 'Ignore',
          },
          {
            value: 'suppress',
            label: "Don't warn again this session",
          },
        ]}
        onChange={value => {
          switch (value) {
            case 'compact':
              void onCompact()
              return
            case 'ignore':
              onIgnore()
              return
            case 'suppress':
              onSuppressForSession()
              return
          }
        }}
      />
    </Dialog>
  )
}
