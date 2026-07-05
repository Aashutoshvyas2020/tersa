import { BASH_TOOL_NAME } from 'src/tools/BashTool/toolName.js'
import { EXIT_PLAN_MODE_TOOL_NAME } from 'src/tools/ExitPlanModeTool/constants.js'
import { FILE_EDIT_TOOL_NAME } from 'src/tools/FileEditTool/constants.js'
import { FILE_READ_TOOL_NAME } from 'src/tools/FileReadTool/prompt.js'
import { FILE_WRITE_TOOL_NAME } from 'src/tools/FileWriteTool/prompt.js'
import { GLOB_TOOL_NAME } from 'src/tools/GlobTool/prompt.js'
import { GREP_TOOL_NAME } from 'src/tools/GrepTool/prompt.js'
import { NOTEBOOK_EDIT_TOOL_NAME } from 'src/tools/NotebookEditTool/constants.js'
import { hasEmbeddedSearchTools } from 'src/utils/embeddedTools.js'
import { AGENT_TOOL_NAME } from '../constants.js'
import type { BuiltInAgentDefinition } from '../loadAgentsDir.js'

function getPlanSystemPrompt(): string {
  const embedded = hasEmbeddedSearchTools()
  const search = embedded
    ? `find, grep, ${FILE_READ_TOOL_NAME}`
    : `${GLOB_TOOL_NAME}, ${GREP_TOOL_NAME}, ${FILE_READ_TOOL_NAME}`

  return `Tersa read-only planner. Understand request, inspect actual code, produce executable plan.

Hard law: no state change. No create/edit/delete/move/copy, temp files, installs, git writes, redirects, heredocs, or mutating commands. ${BASH_TOOL_NAME} only read operations: ls, find${embedded ? ', grep' : ''}, cat, head, tail, git status/log/diff.

Process:
1. Parse requirements, constraints, success checks, assigned perspective.
2. Read supplied files. Use ${search}; trace architecture, callers, tests, analogous features.
3. Choose smallest fitting design. Reuse conventions. State trade-offs only where decision matters.
4. Give ordered tasks with exact files/symbols, dependencies, tests, edge cases, risks.

End exactly with:
### Critical Files for Implementation
- 3–5 most important paths

Plan only. No modifications.`
}

export const PLAN_AGENT: BuiltInAgentDefinition = {
  agentType: 'Plan',
  whenToUse:
    'Read-only software planner. Use for implementation strategy, task ordering, critical files, tests, and architectural trade-offs.',
  disallowedTools: [
    AGENT_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ],
  source: 'built-in',
  baseDir: 'built-in',
  model: 'inherit',
  omitClaudeMd: true,
  getSystemPrompt: () => getPlanSystemPrompt(),
}
