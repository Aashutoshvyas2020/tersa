import * as React from 'react'
import { Box, Text } from 'src/ink.js'
import {
  CAVEMAN_ROCK_LINES,
  CAVEMAN_WELCOME_WIDTH,
} from './cavemanBrand.js'

export function WelcomeV2() {
  return (
    <Box width={CAVEMAN_WELCOME_WIDTH} flexDirection="column">
      <Text>
        <Text color="claude">Welcome to Caveman </Text>
        <Text dimColor>v{MACRO.DISPLAY_VERSION ?? MACRO.VERSION}</Text>
      </Text>
      {CAVEMAN_ROCK_LINES.map((line, index) => (
        <Text
          key={index}
          color={
            index <= 1
              ? 'fastMode'
              : line.includes('██')
                ? 'clawd_body'
                : 'promptBorder'
          }
        >
          {line}
        </Text>
      ))}
    </Box>
  )
}
