import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { CAVEMAN_COMPACT_ROCK } from './cavemanBrand.js'

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right'

type Props = {
  pose?: ClawdPose
}

export function Clawd(_props: Props) {
  return (
    <Box flexDirection="column" alignItems="center">
      {CAVEMAN_COMPACT_ROCK.map((line, index) => (
        <Text
          key={index}
          color={index >= 2 && index <= 3 ? 'clawd_body' : 'claude'}
        >
          {line}
        </Text>
      ))}
    </Box>
  )
}
