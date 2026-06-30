import { existsSync } from 'node:fs'
import { repoSizeReport, sourceImporters } from './repo-size-check.js'

export const removalGroups = {
  assistantCommandStub: ['src/commands/assistant/AssistantSessionChooser.ts'],
  benchmarkCommand: [
    'src/commands/benchmark.ts',
    'src/utils/model/benchmark.ts',
    'src/utils/model/benchmark.test.ts',
  ],
  colorCommandIndex: ['src/commands/color/index.ts'],
  costCommandIndex: ['src/commands/cost/index.ts'],
  statsCommand: ['src/commands/stats/index.ts', 'src/commands/stats/stats.tsx'],
  ideAutoConnectDialog: ['src/components/IdeAutoConnectDialog.tsx'],
  tersaRuntimePanels: ['src/components/LogoV2/TersaRuntimePanels.tsx'],
  sandboxSettingsUi: [
    'src/components/sandbox/SandboxSettings.tsx',
    'src/components/sandbox/SandboxConfigTab.tsx',
    'src/components/sandbox/SandboxDependenciesTab.tsx',
    'src/components/sandbox/SandboxOverridesTab.tsx',
  ],
  legacyGithubWorkflowConstants: ['src/constants/github-app.ts'],
  unusedGrowthbookKeyHelper: ['src/constants/keys.ts'],
  unusedSdkCasingHelpers: ['src/entrypoints/sdk/casing.ts'],
  unusedClaudeCodeHintHook: ['src/hooks/useClaudeCodeHintRecommendation.tsx'],
  unusedDirectConnectSession: [
    'src/server/createDirectConnectSession.ts',
    'src/server/types.ts',
  ],
  unusedAnalyticsModules: [
    'src/services/analytics/firstPartyEventLogger.ts',
    'src/services/analytics/sinkKillswitch.ts',
    'src/services/api/metricsOptOut.ts',
  ],
  unusedInternalLoggingModule: ['src/services/internalLogging.ts'],
  unusedTaggedIdHelper: ['src/utils/taggedId.ts'],
  unusedTelemetryAttributes: ['src/utils/telemetryAttributes.ts'],
} as const

const intentionalRoots = new Set([
  'src/skills/bundled/stuck.ts',
  'src/skills/bundled/tersaApi.ts',
  'src/skills/bundled/tersaApiContent.ts',
  'src/skills/bundled/verifyContent.ts',
  'src/tools/REPLTool/REPLTool.ts',
  'src/tools/SuggestBackgroundPRTool/SuggestBackgroundPRTool.ts',
])

const groupAudits = Object.entries(removalGroups).map(([group, files]) => {
  const groupFiles = new Set<string>(files)
  const remainingFiles = files.filter(file => existsSync(file))
  const externalImporters = Object.fromEntries(
    remainingFiles
      .map(file => [
        file,
        (sourceImporters[file] ?? []).filter(importer => !groupFiles.has(importer)),
      ] as const)
      .filter(([, importers]) => importers.length > 0),
  )
  return {
    group,
    files: [...files],
    remainingFiles,
    externalImporters,
    safeToDelete: Object.keys(externalImporters).length === 0,
    cleanupComplete: remainingFiles.length === 0,
  }
})

const unexpected = repoSizeReport.orphanedSources.filter(
  file => !intentionalRoots.has(file),
)

export const ponytailAuditReport = {
  scannedFiles: repoSizeReport.scannedFiles,
  unusedDependencies: repoSizeReport.unusedDependencies,
  groupAudits,
  intentionalRoots: [...intentionalRoots].sort(),
  unexpected,
  safeToProceed:
    repoSizeReport.unusedDependencies.length === 0 &&
    groupAudits.every(group => group.safeToDelete && group.cleanupComplete) &&
    unexpected.length === 0,
}

if (import.meta.main) {
  console.log(JSON.stringify(ponytailAuditReport, null, 2))
  if (!ponytailAuditReport.safeToProceed) process.exitCode = 1
}
