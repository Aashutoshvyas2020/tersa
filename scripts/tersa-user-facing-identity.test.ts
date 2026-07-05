import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

function source(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

test('core user-facing surfaces do not identify Tersa as Claude Code', () => {
  expect(source('src/commands/branch/branch.ts')).toContain(
    'To resume the original: tersa -r',
  )
  expect(source('src/commands/branch/branch.ts')).not.toContain('claude -r')

  expect(source('src/utils/teleport.tsx')).not.toContain('"claude/')
  expect(source('src/bridge/createSession.ts')).not.toContain('`claude/${')

  expect(source('src/commands/btw/btw.tsx')).toContain('/btw your question')
  expect(source('src/commands/btw/btw.tsx')).not.toContain('<question>')
  expect(source('src/commands/btw/btw.tsx')).toContain('Example:')

  const genericLeaks = [
    ['src/screens/REPL.tsx', 'Claude is waiting for your input'],
    ['src/components/Spinner.tsx', "interrupting Claude's current work"],
    ['src/components/FeedbackSurvey/FeedbackSurveyView.tsx', 'How is Claude doing'],
    ['src/components/NativeAutoUpdater.tsx', 'claude rollback --safe'],
    [
      'src/components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx',
      'exit Claude Code',
    ],
    ['src/components/LogSelector.tsx', 'Claude found these results'],
    [
      'src/components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx',
      'Claude may use instructions',
    ],
    [
      'src/components/permissions/WebFetchPermissionRequest/WebFetchPermissionRequest.tsx',
      'allow Claude to fetch',
    ],
    [
      'src/components/permissions/baseShellToolUseOptions.tsx',
      'tell Claude what to do',
    ],
  ] as const

  for (const [path, phrase] of genericLeaks) {
    expect(source(path)).not.toContain(phrase)
  }

  expect(
    existsSync(
      join(root, 'src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts'),
    ),
  ).toBe(false)
  expect(source('src/tools/AgentTool/builtInAgents.ts')).toContain('TERSA_AGENT')
})
