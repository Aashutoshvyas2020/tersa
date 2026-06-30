import * as React from 'react'
import { PRODUCT_DISPLAY_NAME } from '../../constants/product.js'
import { Box, Text } from '../../ink.js'
import { ResponsiveRow } from '../design-system/ResponsiveRow.js'

const QUICK_START = [
  ['1', 'Describe the outcome you want and any constraints.'],
  ['2', 'Review the plan and approve only the permissions it needs.'],
  ['3', 'Inspect /diff, run the relevant tests, then commit.'],
] as const

const ESSENTIAL_COMMANDS = [
  ['/status', 'runtime, model, effort, and integrations'],
  ['/model', 'change the active model'],
  ['/permissions', 'review or change tool access'],
  ['/diff', 'inspect repository changes'],
  ['/modes', 'configure planning and optimization modes'],
  ['$<skill>', 'run an installed skill'],
] as const

export function General(): React.ReactNode {
  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Text wrap="wrap">
        {PRODUCT_DISPLAY_NAME} works in your repository, proposes changes, and
        runs commands with the permissions you approve.
      </Text>

      <Box flexDirection="column">
        <Text bold>Start here</Text>
        {QUICK_START.map(([step, description]) => (
          <ResponsiveRow key={step} stackBelow={60} gap={1}>
            <Text color="suggestion">{step}.</Text>
            <Text wrap="wrap">{description}</Text>
          </ResponsiveRow>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text bold>Essentials</Text>
        {ESSENTIAL_COMMANDS.map(([command, description]) => (
          <ResponsiveRow key={command} stackBelow={60} gap={1}>
            <Box width={14} flexShrink={0}>
              <Text color="suggestion">{command}</Text>
            </Box>
            <Text dimColor wrap="wrap">
              {description}
            </Text>
          </ResponsiveRow>
        ))}
      </Box>

      <Text dimColor wrap="wrap">
        Open the Commands tab and type to filter the complete command list.
      </Text>
    </Box>
  )
}
