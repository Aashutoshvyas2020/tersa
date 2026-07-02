import { execFileSync } from 'node:child_process'
import { repoSizeReport } from './repo-size-check.js'

const intentionalRoots = new Set([
  // Present in the original upstream import. Preserve dependency/upstream
  // surfaces even when the current Tersa entrypoints do not import them.
  'src/components/ContextSuggestions.tsx',
  'src/skills/bundled/stuck.ts',
  'src/skills/bundled/tersaApi.ts',
  'src/skills/bundled/tersaApiContent.ts',
  'src/skills/bundled/verifyContent.ts',
  'src/tools/REPLTool/REPLTool.ts',
  'src/tools/SuggestBackgroundPRTool/SuggestBackgroundPRTool.ts',
])

function getUpstreamFiles(): Set<string> {
  try {
    const rootCommit = execFileSync(
      'git',
      ['rev-list', '--max-parents=0', 'HEAD'],
      { encoding: 'utf8' },
    ).trim().split('\n')[0]
    if (!rootCommit) return new Set()
    return new Set(
      execFileSync('git', ['ls-tree', '-r', '--name-only', rootCommit], {
        encoding: 'utf8',
      }).trim().split('\n').filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

const upstreamFiles = getUpstreamFiles()
const protectedUpstreamOrphans = repoSizeReport.orphanedSources.filter(file =>
  upstreamFiles.has(file),
)
const unexpected = repoSizeReport.orphanedSources.filter(
  file => !intentionalRoots.has(file) && !upstreamFiles.has(file),
)

export const ponytailAuditReport = {
  scannedFiles: repoSizeReport.scannedFiles,
  unusedDependencies: repoSizeReport.unusedDependencies,
  groupAudits: [],
  intentionalRoots: [...intentionalRoots].sort(),
  protectedUpstreamOrphans,
  unexpected,
  safeToProceed:
    repoSizeReport.unusedDependencies.length === 0 &&
    unexpected.length === 0,
}

if (import.meta.main) {
  console.log(JSON.stringify(ponytailAuditReport, null, 2))
  if (!ponytailAuditReport.safeToProceed) process.exitCode = 1
}
