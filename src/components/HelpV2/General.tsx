import * as React from 'react'
import { PRODUCT_DISPLAY_NAME } from '../../constants/product.js'
import { Box, Text } from '../../ink.js'
import { getTersaOptimizationStatusRows } from '../../utils/tersaStatus.js'
import { PromptInputHelpMenu } from '../PromptInput/PromptInputHelpMenu.js'

const OPTIMIZATION_HELP: Record<string, string> = {
  Mode:
    'Global cave mode. full turns the token-saver stack on, light keeps it leaner, off disables it.',
  Tool:
    'Compress tool output before it enters the conversation, so raw logs do not waste context.',
  Struct:
    'Run structure-aware compression on large JSON or XML output instead of dumping it raw.',
  Dedup:
    'If the same file or range is read again unchanged, return a short reuse stub instead of full text.',
  History:
    'Compress older tool/result history so long sessions keep less dead weight.',
  RTK:
    'Rewrite shell commands to smaller or cleaner equivalents when a shorter command is safe.',
  Repo:
    'Inject a compact repo map instead of flooding context with broad file-tree detail.',
  Memory:
    'Inject a compact memory recall instead of replaying all historical notes.',
  Skill:
    'Compress skill prompt text before it is injected. full is the strongest visible compression.',
  ML:
    'Optional model-based compression sidecar. off means no ML compressor is active.',
  Sidecar:
    'The external command used for ML compression. configured/unset shows whether a sidecar exists.',
  Profile:
    'Mode preset. minimal = Karpathy only; standard = Karpathy + Super; full-auto = all modes.',
  Karpathy:
    'Simplicity first. Explicit assumptions, smallest safe change, and proof before done.',
  Super:
    'Structured execution. Clarify, plan, test, verify, and review before claiming complete.',
  GSD:
    'Phase-driven execution with checkpoints and explicit blocker reporting.',
  Designer:
    'UI taste mode. Keep hierarchy clear, surfaces restrained, and controls legible.',
}

function renderOptimizationRow(label: string, value: string): React.ReactNode {
  return (
    <Text key={label} wrap="wrap">
      <Text color="inactive">{label.padEnd(8)}</Text>
      <Text color="inactive">· </Text>
      <Text color="text">{value}</Text>
      <Text color="inactive"> — {OPTIMIZATION_HELP[label] ?? 'No help text available.'}</Text>
    </Text>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <Text bold>{children}</Text>
    </Box>
  )
}

export function General() {
  const optimizationRows = getTersaOptimizationStatusRows()

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Box>
        <Text>
          {PRODUCT_DISPLAY_NAME} understands your codebase, makes edits with your permission, and executes commands — right from your terminal.
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        <SectionTitle>Shortcuts</SectionTitle>
        <PromptInputHelpMenu gap={2} fixedWidth={true} />
      </Box>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <SectionTitle>Optimize</SectionTitle>
        <Box flexDirection="column" gap={0}>
          {optimizationRows.map(([label, value]) => renderOptimizationRow(label, value))}
        </Box>
      </Box>
    </Box>
  )
}
