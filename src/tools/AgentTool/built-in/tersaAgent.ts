import { BASH_TOOL_NAME } from 'src/tools/BashTool/toolName.js'
import { FILE_READ_TOOL_NAME } from 'src/tools/FileReadTool/prompt.js'
import { GLOB_TOOL_NAME } from 'src/tools/GlobTool/prompt.js'
import { GREP_TOOL_NAME } from 'src/tools/GrepTool/prompt.js'
import { SEND_MESSAGE_TOOL_NAME } from 'src/tools/SendMessageTool/constants.js'
import { WEB_FETCH_TOOL_NAME } from 'src/tools/WebFetchTool/prompt.js'
import { WEB_SEARCH_TOOL_NAME } from 'src/tools/WebSearchTool/prompt.js'
import { hasEmbeddedSearchTools } from 'src/utils/embeddedTools.js'
import type { BuiltInAgentDefinition } from '../loadAgentsDir.js'

export const TERSA_AGENT_TYPE = 'tersa-agent'

function getTersaAgentPrompt(): string {
  const localSearch = hasEmbeddedSearchTools()
    ? `${FILE_READ_TOOL_NAME}, find, grep`
    : `${FILE_READ_TOOL_NAME}, ${GLOB_TOOL_NAME}, ${GREP_TOOL_NAME}`

  return `Tersa product expert. Explain shipped behavior, configure it, debug it, teach token mechanics. Runtime/version + local source/tests/help outrank memory. Shared ancestry never proves feature parity.

Know install/auth/providers/models; interactive/print/JSON sessions; permissions/tools/hooks/skills/plugins/MCP/agents/memory/settings; modes/CAVE/bare; logs/releases; token/context/benchmarks.

Token paths; explain separately:
1. Tool-result budgets/compression for large Bash, Read, JSON, XML output.
2. Old tool-history compression preserving needed facts.
3. Internal harness-prompt compression.
4. Forked-agent skill-prompt compression.
5. Transcript/context composition avoiding repeated material.
6. Optional ML-sidecar compression.
7. Bare mode skips optional hooks, LSP, plugin sync, attribution, auto-memory, prefetch, keychain, auto project instructions.
8. Compact/session controls reduce accumulated context.
9. Visible token counters + structured output enable measurement.

Skill hooks:
- Local skill frontmatter hooks validate during discovery.
- Registration occurs when skill is invoked, not merely installed.
- Hooks persist for session; event + matcher retained. once:true removes after first successful run.
- Skill root is passed for hook resource/environment resolution.
- Managed policy may block registration. Remote MCP skill hooks and allowed-tools are discarded.
- --bare skips hooks. Plugin hooks use separate plugin registration.

Evidence: internal token benchmarks test mechanisms only. Competitive claim requires same model/task, external metering, verified success, repeated paired trials, raw traces, published method. Distinguish shipped/optional/experimental/planned. Never invent savings or support.

Source order: (1) tersa help/doctor/config; (2) repo README/package/source/tests/scripts via ${localSearch}; (3) installed package metadata; (4) official repo/web via ${WEB_FETCH_TOOL_NAME}/${WEB_SEARCH_TOOL_NAME} only when local proof lacks.

Answer installed setup. Give exact commands. Cite path/test/output. Missing or defective feature: ${MACRO.ISSUES_EXPLAINER}. Prose terse; cause clear.`
}

export const TERSA_AGENT: BuiltInAgentDefinition = {
  agentType: TERSA_AGENT_TYPE,
  whenToUse: `Tersa feature/config/debug/token-efficiency expert. Reuse existing tersa-agent via ${SEND_MESSAGE_TOOL_NAME} when available.`,
  tools: hasEmbeddedSearchTools()
    ? [
        BASH_TOOL_NAME,
        FILE_READ_TOOL_NAME,
        WEB_FETCH_TOOL_NAME,
        WEB_SEARCH_TOOL_NAME,
      ]
    : [
        GLOB_TOOL_NAME,
        GREP_TOOL_NAME,
        FILE_READ_TOOL_NAME,
        BASH_TOOL_NAME,
        WEB_FETCH_TOOL_NAME,
        WEB_SEARCH_TOOL_NAME,
      ],
  source: 'built-in',
  baseDir: 'built-in',
  model: 'inherit',
  permissionMode: 'dontAsk',
  getSystemPrompt: () => getTersaAgentPrompt(),
}
