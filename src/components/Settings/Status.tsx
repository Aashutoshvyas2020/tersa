import figures from 'figures'
import * as React from 'react'
import { Suspense, use } from 'react'
import { getSessionId } from '../../bootstrap/state.js'
import type { LocalJSXCommandContext } from '../../commands.js'
import { useIsInsideModal } from '../../context/modalContext.js'
import { Box, Text, useTheme } from '../../ink.js'
import { type AppState, useAppState } from '../../state/AppState.js'
import { getCwd } from '../../utils/cwd.js'
import { getCurrentSessionTitle } from '../../utils/sessionStorage.js'
import { getRuntimePresentationState } from '../../utils/runtimePresentationState.js'
import {
  buildAccountProperties,
  buildAPIProviderProperties,
  buildIDEProperties,
  buildInstallationDiagnostics,
  buildInstallationHealthDiagnostics,
  buildMcpProperties,
  buildMemoryDiagnostics,
  buildSandboxProperties,
  buildSettingSourcesProperties,
  type Diagnostic,
  type Property,
} from '../../utils/status.js'
import type { ThemeName } from '../../utils/theme.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'

type Props = {
  context: LocalJSXCommandContext
  diagnosticsPromise: Promise<Diagnostic[]>
}

export function isDuplicateRuntimeProperty(property: Property): boolean {
  if (property.label === undefined) return false
  return (
    property.label === 'API provider' ||
    property.label === 'Model' ||
    property.label.endsWith('base URL')
  )
}

export function buildStatusRuntimeProperties(
  mainLoopModel: AppState['mainLoopModel'],
  effortValue: AppState['effortValue'],
): Property[] {
  const runtime = getRuntimePresentationState(mainLoopModel, effortValue)
  return [
    { label: 'Provider', value: runtime.provider },
    { label: 'Model', value: runtime.model },
    { label: 'Effort', value: runtime.effort },
    { label: 'Endpoint', value: runtime.endpoint },
  ]
}

function buildPrimarySection(
  mainLoopModel: AppState['mainLoopModel'],
  effortValue: AppState['effortValue'],
): Property[] {
  const sessionId = getSessionId()
  const customTitle = getCurrentSessionTitle(sessionId)
  const nameValue = customTitle ?? <Text dimColor>/rename to add a name</Text>
  const providerDetails = buildAPIProviderProperties().filter(
    property => !isDuplicateRuntimeProperty(property),
  )

  return [
    {
      label: 'Version',
      value: MACRO.DISPLAY_VERSION ?? MACRO.VERSION,
    },
    {
      label: 'Session name',
      value: nameValue,
    },
    {
      label: 'Session ID',
      value: sessionId,
    },
    {
      label: 'cwd',
      value: getCwd(),
    },
    ...buildStatusRuntimeProperties(mainLoopModel, effortValue),
    ...buildAccountProperties(),
    ...providerDetails,
  ]
}

function buildSecondarySection({
  mcp,
  theme,
  context,
}: {
  mcp: AppState['mcp']
  theme: ThemeName
  context: LocalJSXCommandContext
}): Property[] {
  return [
    ...buildIDEProperties(
      mcp.clients,
      context.options.ideInstallationStatus,
      theme,
    ),
    ...buildMcpProperties(mcp.clients, theme),
    ...buildSandboxProperties(),
    ...buildSettingSourcesProperties(),
  ]
}

export async function buildDiagnostics(): Promise<Diagnostic[]> {
  return [
    ...(await buildInstallationDiagnostics()),
    ...(await buildInstallationHealthDiagnostics()),
    ...(await buildMemoryDiagnostics()),
  ]
}

function PropertyValue({ value }: { value: Property['value'] }): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <Box flexWrap="wrap" columnGap={1} flexShrink={99}>
        {value.map((item, index) => (
          <Text key={`${item}-${index}`}>
            {item}
            {index < value.length - 1 ? ',' : ''}
          </Text>
        ))}
      </Box>
    )
  }
  if (typeof value === 'string') return <Text>{value}</Text>
  return value
}

function PropertySection({ properties }: { properties: Property[] }): React.ReactNode {
  if (properties.length === 0) return null
  return (
    <Box flexDirection="column">
      {properties.map(({ label, value }, index) => (
        <Box
          key={`${label ?? 'property'}-${index}`}
          flexDirection="row"
          gap={1}
          flexShrink={0}
        >
          {label !== undefined ? <Text bold>{label}:</Text> : null}
          <PropertyValue value={value} />
        </Box>
      ))}
    </Box>
  )
}

export function Status({ context, diagnosticsPromise }: Props): React.ReactNode {
  const mainLoopModel = useAppState(state => state.mainLoopModel)
  const effortValue = useAppState(state => state.effortValue)
  const mcp = useAppState(state => state.mcp)
  const [theme] = useTheme()
  const grow = useIsInsideModal() ? 1 : undefined

  const sections = React.useMemo(
    () => [
      buildPrimarySection(mainLoopModel, effortValue),
      buildSecondarySection({ mcp, theme, context }),
    ],
    [context, effortValue, mainLoopModel, mcp, theme],
  )

  return (
    <Box flexDirection="column" flexGrow={grow}>
      <Box flexDirection="column" gap={1} flexGrow={grow}>
        {sections.map((properties, index) => (
          <PropertySection key={index} properties={properties} />
        ))}
        <Suspense fallback={null}>
          <Diagnostics promise={diagnosticsPromise} />
        </Suspense>
      </Box>
      <Text dimColor>
        <ConfigurableShortcutHint
          action="confirm:no"
          context="Settings"
          fallback="Esc"
          description="cancel"
        />
      </Text>
    </Box>
  )
}

function Diagnostics({
  promise,
}: {
  promise: Promise<Diagnostic[]>
}): React.ReactNode {
  const diagnostics = use(promise)
  if (diagnostics.length === 0) return null

  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Text bold>System Diagnostics</Text>
      {diagnostics.map((diagnostic, index) => (
        <Box key={index} flexDirection="row" gap={1} paddingX={1}>
          <Text color="error">{figures.warning}</Text>
          {typeof diagnostic === 'string' ? (
            <Text wrap="wrap">{diagnostic}</Text>
          ) : (
            diagnostic
          )}
        </Box>
      ))}
    </Box>
  )
}
