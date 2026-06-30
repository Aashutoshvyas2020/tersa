import figures from 'figures'
import * as React from 'react'
import type { ReactNode } from 'react'
import { useDeclaredCursor } from '../../ink/hooks/use-declared-cursor.js'
import { Box, Text } from '../../ink.js'

export type ListItemProps = {
  isFocused: boolean
  isSelected?: boolean
  children: ReactNode
  description?: string
  showScrollDown?: boolean
  showScrollUp?: boolean
  styled?: boolean
  disabled?: boolean
  declareCursor?: boolean
}

function Indicator({
  disabled,
  isFocused,
  showScrollDown,
  showScrollUp,
}: Pick<
  ListItemProps,
  'disabled' | 'isFocused' | 'showScrollDown' | 'showScrollUp'
>): React.ReactNode {
  if (disabled) return <Text> </Text>
  if (isFocused) return <Text color="suggestion">{figures.pointer}</Text>
  if (showScrollDown) return <Text dimColor>{figures.arrowDown}</Text>
  if (showScrollUp) return <Text dimColor>{figures.arrowUp}</Text>
  return <Text> </Text>
}

export function ListItem({
  isFocused,
  isSelected = false,
  children,
  description,
  showScrollDown,
  showScrollUp,
  styled = true,
  disabled = false,
  declareCursor = true,
}: ListItemProps): React.ReactNode {
  const textColor = disabled
    ? 'inactive'
    : !styled
      ? undefined
      : isFocused
        ? 'text'
        : isSelected
          ? 'claude'
          : undefined
  const backgroundColor =
    isFocused && !disabled ? 'messageActionsBackground' : undefined
  const cursorRef = useDeclaredCursor({
    line: 0,
    column: 0,
    active: isFocused && !disabled && declareCursor,
  })

  return (
    <Box ref={cursorRef} flexDirection="column" width="100%">
      <Box
        flexDirection="row"
        gap={1}
        width="100%"
        backgroundColor={backgroundColor}
        alignItems="flex-start"
      >
        <Box flexShrink={0}>
          <Indicator
            disabled={disabled}
            isFocused={isFocused}
            showScrollDown={showScrollDown}
            showScrollUp={showScrollUp}
          />
        </Box>
        <Box flexGrow={1} flexShrink={1} minWidth={1}>
          {styled ? (
            <Text
              color={textColor}
              dimColor={disabled}
              bold={isFocused && !disabled}
              wrap="wrap"
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </Box>
        {isSelected && !disabled ? (
          <Box flexShrink={0}>
            <Text color="success">{figures.tick}</Text>
          </Box>
        ) : null}
      </Box>
      {description ? (
        <Box
          paddingLeft={2}
          width="100%"
          backgroundColor={backgroundColor}
        >
          <Text
            color={isFocused && !disabled ? 'text' : 'inactive'}
            wrap="wrap"
          >
            {description}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
