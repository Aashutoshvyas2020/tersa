import * as React from 'react'
import { useTerminalSize } from '../hooks/useTerminalSize.js'
import { Box, Text } from '../ink.js'
import type { ContextData } from '../utils/analyzeContext.js'
import {
  generateContextSuggestions,
  type ContextSuggestion,
} from '../utils/contextSuggestions.js'
import { getDisplayPath } from '../utils/file.js'
import { formatTokens } from '../utils/format.js'
import { ResponsiveRow } from './design-system/ResponsiveRow.js'

const RESERVED_CATEGORY_NAMES = new Set([
  'Autocompact buffer',
  'Compact buffer',
])

export type ContextContributor = {
  name: string
  tokens: number
  percentage: number
}

export type ContextOverview = {
  usedTokens: number
  availableTokens: number
  reserveTokens: number
  thresholdTokens: number | null
  percentage: number
  contributors: ContextContributor[]
  deferredTokens: number
  suggestions: ContextSuggestion[]
}

export function buildContextOverview(data: ContextData): ContextOverview {
  const availableTokens =
    data.categories.find(category => category.name === 'Free space')?.tokens ??
    Math.max(0, data.rawMaxTokens - data.totalTokens)
  const reserveTokens = data.categories
    .filter(category => RESERVED_CATEGORY_NAMES.has(category.name))
    .reduce((sum, category) => sum + category.tokens, 0)
  const deferredTokens = data.categories
    .filter(category => category.isDeferred)
    .reduce((sum, category) => sum + category.tokens, 0)
  const contributors = data.categories
    .filter(
      category =>
        category.tokens > 0 &&
        !category.isDeferred &&
        category.name !== 'Free space' &&
        !RESERVED_CATEGORY_NAMES.has(category.name),
    )
    .map(category => ({
      name: category.name.replace('[internal] ', ''),
      tokens: category.tokens,
      percentage:
        data.rawMaxTokens > 0
          ? (category.tokens / data.rawMaxTokens) * 100
          : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)

  return {
    usedTokens: data.totalTokens,
    availableTokens,
    reserveTokens,
    thresholdTokens: data.autoCompactThreshold ?? null,
    percentage: data.percentage,
    contributors,
    deferredTokens,
    suggestions: generateContextSuggestions(data),
  }
}

export function buildCapacityBar(percentage: number, width: number): string {
  const barWidth = Math.max(8, Math.min(32, Math.floor(width)))
  const normalized = Math.max(0, Math.min(100, percentage))
  const filled = Math.round((normalized / 100) * barWidth)
  return `${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)}`
}

function getCapacityLabel(percentage: number): {
  label: string
  color: 'success' | 'warning' | 'error'
} {
  if (percentage >= 90) return { label: 'Critical', color: 'error' }
  if (percentage >= 75) return { label: 'Watch', color: 'warning' }
  return { label: 'Healthy', color: 'success' }
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}): React.ReactNode {
  return (
    <ResponsiveRow stackBelow={60} gap={1}>
      <Box width={14} flexShrink={0}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text wrap="wrap">{value}</Text>
    </ResponsiveRow>
  )
}

function SuggestionRow({
  suggestion,
  index,
}: {
  suggestion: ContextSuggestion
  index: number
}): React.ReactNode {
  return (
    <Box flexDirection="column" marginTop={index === 0 ? 0 : 1}>
      <Text
        color={suggestion.severity === 'warning' ? 'warning' : 'text'}
        bold={suggestion.severity === 'warning'}
        wrap="wrap"
      >
        {suggestion.title}
        {suggestion.savingsTokens
          ? ` · save ~${formatTokens(suggestion.savingsTokens)}`
          : ''}
      </Text>
      <Text dimColor wrap="wrap">
        {suggestion.detail}
      </Text>
    </Box>
  )
}

interface Props {
  data: ContextData
}

export function ContextVisualization({ data }: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const overview = buildContextOverview(data)
  const capacity = getCapacityLabel(overview.percentage)
  const barWidth = columns < 60 ? Math.max(8, columns - 10) : 24
  const topContributors = overview.contributors.slice(0, columns < 60 ? 3 : 5)
  const hiddenContributors = Math.max(
    0,
    overview.contributors.length - topContributors.length,
  )
  const thresholdDescription = overview.thresholdTokens
    ? `${formatTokens(overview.thresholdTokens)} tokens (${Math.round(
        (overview.thresholdTokens / data.rawMaxTokens) * 100,
      )}%)`
    : data.isAutoCompactEnabled
      ? 'managed by runtime'
      : 'manual /compact'
  const largestMemoryFiles = [...data.memoryFiles]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 3)
  const loadedMcpCount = data.mcpTools.filter(tool => tool.isLoaded !== false).length
  const deferredMcpCount = data.mcpTools.filter(tool => tool.isLoaded === false).length
  const suggestions = overview.suggestions.slice(0, 3)

  return (
    <Box flexDirection="column" gap={1} paddingLeft={1}>
      <Text bold>Context</Text>

      <Box flexDirection="column">
        <Text color={capacity.color} bold>
          {buildCapacityBar(overview.percentage, barWidth)}{' '}
          {Math.round(overview.percentage)}% · {capacity.label}
        </Text>
        <SummaryRow label="Model" value={data.model} />
        <SummaryRow
          label="Used"
          value={`${formatTokens(overview.usedTokens)} / ${formatTokens(
            data.rawMaxTokens,
          )} tokens`}
        />
        <SummaryRow
          label="Available"
          value={`${formatTokens(overview.availableTokens)} tokens`}
        />
        <SummaryRow
          label="Reserve"
          value={
            overview.reserveTokens > 0
              ? `${formatTokens(overview.reserveTokens)} tokens`
              : 'none'
          }
        />
        <SummaryRow label="Threshold" value={thresholdDescription} />
      </Box>

      <Box flexDirection="column">
        <Text bold>Largest contributors</Text>
        {topContributors.map((contributor, index) => (
          <ResponsiveRow key={contributor.name} stackBelow={60} gap={1}>
            <Box width={columns < 60 ? undefined : 4} flexShrink={0}>
              <Text dimColor>{index + 1}.</Text>
            </Box>
            <Box width={columns < 60 ? undefined : 24} flexShrink={1}>
              <Text wrap="truncate-end">{contributor.name}</Text>
            </Box>
            <Text dimColor>
              {formatTokens(contributor.tokens)} ·{' '}
              {contributor.percentage.toFixed(1)}%
            </Text>
          </ResponsiveRow>
        ))}
        {hiddenContributors > 0 ? (
          <Text dimColor>+{hiddenContributors} smaller contributors</Text>
        ) : null}
        {overview.deferredTokens > 0 ? (
          <Text dimColor>
            Deferred tools: {formatTokens(overview.deferredTokens)} tokens,
            loaded only when needed
          </Text>
        ) : null}
      </Box>

      {suggestions.length > 0 ? (
        <Box flexDirection="column">
          <Text bold>Next actions</Text>
          {suggestions.map((suggestion, index) => (
            <SuggestionRow
              key={`${suggestion.title}-${index}`}
              suggestion={suggestion}
              index={index}
            />
          ))}
        </Box>
      ) : (
        <Text color="success">No context cleanup is needed right now.</Text>
      )}

      <Box flexDirection="column">
        <Text bold>Details</Text>
        <Text dimColor wrap="wrap">
          MCP: {loadedMcpCount} loaded
          {deferredMcpCount > 0 ? `, ${deferredMcpCount} deferred` : ''} ·{' '}
          Skills: {data.skills?.includedSkills ?? 0}/
          {data.skills?.totalSkills ?? 0} included · Agents: {data.agents.length}
        </Text>
        {largestMemoryFiles.length > 0 ? (
          <Text dimColor wrap="wrap">
            Largest memory files:{' '}
            {largestMemoryFiles
              .map(
                file =>
                  `${getDisplayPath(file.path)} (${formatTokens(file.tokens)})`,
              )
              .join(', ')}
          </Text>
        ) : null}
        <Text dimColor>
          Use /compact to reduce history, /memory to review memory files, and
          /mcp to inspect tool servers.
        </Text>
      </Box>
    </Box>
  )
}
