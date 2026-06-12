import * as React from 'react'
import { Box, Text } from 'src/ink.js'
import {
  TERSA_ROCK_LINES,
  TERSA_WELCOME_WIDTH,
} from './tersaBrand.js'
import { TersaAsciiLogo } from './TersaAsciiLogo.js'

export function WelcomeV2() {
  return (
    <Box width={TERSA_WELCOME_WIDTH} flexDirection="column">
      <TersaAsciiLogo />
      <Text color="inactive">v{MACRO.DISPLAY_VERSION ?? MACRO.VERSION}</Text>
      {TERSA_ROCK_LINES.map((line, index) => (
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
