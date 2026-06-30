import * as React from 'react'
import { useMemo } from 'react'
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js'
import {
  builtInCommandNames,
  type Command,
  type CommandResultDisplay,
} from '../../commands.js'
import { useIsInsideModal } from '../../context/modalContext.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { Box, Link, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { getPublicBuildVersion } from '../../utils/version.js'
import { Pane } from '../design-system/Pane.js'
import { Tab, Tabs } from '../design-system/Tabs.js'
import { getTerminalWidthBand } from '../design-system/responsiveLayout.js'
import { Commands } from './Commands.js'
import { General } from './General.js'

type Props = {
  onClose: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  commands: Command[]
}

export function HelpV2({ onClose, commands }: Props): React.ReactNode {
  const { rows, columns } = useTerminalSize()
  const insideModal = useIsInsideModal()
  const close = React.useCallback(
    () => onClose('Help dialog dismissed', { display: 'system' }),
    [onClose],
  )
  useKeybinding('help:dismiss', close, { context: 'Help' })
  const exitState = useExitOnCtrlCDWithKeybindings(close)
  const dismissShortcut = useShortcutDisplay('help:dismiss', 'Help', 'esc')
  const maxHeight = Math.max(12, Math.min(rows - 2, Math.floor(rows * 0.75)))
  const widthBand = getTerminalWidthBand(columns)

  const { builtinCommands, customCommands } = useMemo(() => {
    const builtinNames = builtInCommandNames()
    return {
      builtinCommands: commands.filter(
        command => builtinNames.has(command.name) && !command.isHidden,
      ),
      customCommands: commands.filter(
        command => !builtinNames.has(command.name) && !command.isHidden,
      ),
    }
  }, [commands])

  if (widthBand === 'unsupported') {
    return (
      <Pane color="professionalBlue">
        <Text bold>Tersa help</Text>
        <Text wrap="wrap">
          This terminal is {columns} columns wide. Resize it to at least 40
          columns to open help.
        </Text>
        <Text dimColor>{dismissShortcut} to close</Text>
      </Pane>
    )
  }

  return (
    <Box flexDirection="column" height={insideModal ? undefined : maxHeight}>
      <Pane color="professionalBlue">
        <Tabs
          title={`Tersa v${getPublicBuildVersion()}`}
          color="professionalBlue"
          defaultTab="general"
        >
          <Tab key="general" title="general">
            <General />
          </Tab>
          <Tab key="commands" title="commands">
            <Commands
              commands={builtinCommands}
              maxHeight={maxHeight}
              columns={columns}
              title="Default commands"
              onCancel={close}
            />
          </Tab>
          <Tab key="custom" title="custom">
            <Commands
              commands={customCommands}
              maxHeight={maxHeight}
              columns={columns}
              title="Custom commands"
              emptyMessage="No custom commands installed"
              onCancel={close}
            />
          </Tab>
        </Tabs>
        <Box marginTop={1} flexDirection={columns < 60 ? 'column' : 'row'}>
          <Text dimColor>
            Docs: <Link url="https://github.com/Gitlawb/tersa" />
          </Text>
          <Box flexGrow={1} />
          <Text dimColor>
            {exitState.pending
              ? `Press ${exitState.keyName} again to exit`
              : `${dismissShortcut} to close`}
          </Text>
        </Box>
      </Pane>
    </Box>
  )
}
