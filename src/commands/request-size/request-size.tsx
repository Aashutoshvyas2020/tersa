import * as React from 'react'
import { Pane } from '../../components/design-system/Pane.js'
import { ResponsiveRow } from '../../components/design-system/ResponsiveRow.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { formatFileSize, formatTokens } from '../../utils/format.js'
import {
  createRequestSizeReport,
  type RequestSizeReport,
} from '../../utils/requestSizeBreakdown.js'
import { collectContextData } from '../context/context-noninteractive.js'

type RequestSizeReportViewProps = {
  report: RequestSizeReport | null
  errorMessage?: string
  onClose: () => void
}

export function RequestSizeReportView({
  report,
  errorMessage,
  onClose,
}: RequestSizeReportViewProps): React.ReactNode {
  useKeybinding('confirm:no', onClose, { context: 'Confirmation' })
  const { columns } = useTerminalSize()
  const compact = columns < 60

  return (
    <Pane color="permission">
      <Box flexDirection="column" gap={1}>
        <Text bold color="permission">
          Request context size
        </Text>

        {report ? (
          <>
            <Box flexDirection="column">
              <ResponsiveRow stackBelow={60} gap={1}>
                <Box width={compact ? undefined : 18} flexShrink={0}>
                  <Text dimColor>Estimated load</Text>
                </Box>
                <Text>
                  {formatTokens(report.estimatedTokens)} tokens ·{' '}
                  {formatFileSize(report.estimatedBytes)} byte equivalent
                </Text>
              </ResponsiveRow>
              <Text dimColor wrap="wrap">
                Context estimate only. Serialized JSON and base64 media may be
                larger on the wire.
              </Text>
              <Text dimColor wrap="wrap">
                Contributor names and sizes only; request content is not shown.
              </Text>
            </Box>

            <Box flexDirection="column">
              <Text bold>Top contributors</Text>
              {report.topContributors.length === 0 ? (
                <Text dimColor>No request contributors found.</Text>
              ) : (
                report.topContributors.map((contributor, index) => (
                  <Box
                    key={`${contributor.kind}-${contributor.label}-${index}`}
                    flexDirection="column"
                    marginTop={index === 0 ? 0 : compact ? 1 : 0}
                  >
                    <ResponsiveRow stackBelow={60} gap={1}>
                      <Box width={compact ? undefined : 4} flexShrink={0}>
                        <Text dimColor>{index + 1}.</Text>
                      </Box>
                      <Box width={compact ? undefined : 28} flexGrow={1} flexShrink={1}>
                        <Text wrap="truncate-end">{contributor.label}</Text>
                      </Box>
                      <Box width={compact ? undefined : 11} flexShrink={0}>
                        <Text dimColor>
                          {formatTokens(contributor.tokens).padStart(compact ? 0 : 8)}
                        </Text>
                      </Box>
                      <Box width={compact ? undefined : 14} flexShrink={0}>
                        <Text dimColor>
                          {formatFileSize(contributor.bytes).padStart(
                            compact ? 0 : 10,
                          )}
                        </Text>
                      </Box>
                    </ResponsiveRow>
                    {contributor.details ? (
                      <Text dimColor wrap="wrap">
                        {contributor.details}
                      </Text>
                    ) : null}
                  </Box>
                ))
              )}
            </Box>
          </>
        ) : (
          <Text color="warning" wrap="wrap">
            {errorMessage ??
              'Unable to estimate request context size for the current context.'}
          </Text>
        )}

        <Text dimColor>Esc to close</Text>
      </Box>
    </Pane>
  )
}

export const call: LocalJSXCommandCall = async (onDone, context) => {
  let report: RequestSizeReport | null = null
  let errorMessage: string | undefined
  try {
    const data = await collectContextData(context)
    report = createRequestSizeReport(data)
  } catch {
    errorMessage =
      'Unable to estimate request context size for the current context.'
  }

  const close = () => {
    onDone(undefined, { display: 'skip' })
  }

  return (
    <RequestSizeReportView
      report={report}
      errorMessage={errorMessage}
      onClose={close}
    />
  )
}
