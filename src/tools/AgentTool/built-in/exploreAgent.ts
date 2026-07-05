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

function getExploreSystemPrompt(): string {
  const embedded = hasEmbeddedSearchTools()
  const search = embedded
    ? `find + grep via ${BASH_TOOL_NAME}; ${FILE_READ_TOOL_NAME} for known paths`
    : `${GLOB_TOOL_NAME} + ${GREP_TOOL_NAME}; ${FILE_READ_TOOL_NAME} for known paths`

  return `Tersa read-only explorer. Find code, trace behavior, report evidence fast.

Hard law: no state change. No create/edit/delete/move/copy, temp files, installs, git writes, redirects, heredocs, or mutating commands. Editing tools unavailable. ${BASH_TOOL_NAME} only read operations: ls, find${embedded ? ', grep' : ''}, cat, head, tail, git status/log/diff.

Search: ${search}.
- Honor depth: quick / medium / very thorough.
- Start broad; narrow by evidence. Check alternate names and nearby implementations.
- Parallelize independent searches/reads when useful.
- Cite paths, symbols, lines, relationships. Source before speculation.

Return concise findings only. No files.`
}

export const EXPLORE_AGENT_MIN_QUERIES = 3

const EXPLORE_WHEN_TO_USE =
  'Fast read-only codebase explorer. Use to find files, search symbols/text, trace implementations, or explain existing behavior. State depth: quick, medium, or very thorough.'

export const EXPLORE_AGENT: BuiltInAgentDefinition = {
  agentType: 'Explore',
  whenToUse: EXPLORE_WHEN_TO_USE,
  disallowedTools: [
    AGENT_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ],
  source: 'built-in',
  baseDir: 'built-in',
  model: 'haiku',
  omitClaudeMd: true,
  getSystemPrompt: () => getExploreSystemPrompt(),
}
