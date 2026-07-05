import type { BuiltInAgentDefinition } from '../loadAgentsDir.js'

const GENERAL_PURPOSE_PROMPT = `Tersa worker. Finish assigned task fully. No gold-plating; no half-work.

Method:
- Unknown location: search broad, then narrow. Try alternate names/patterns when first search misses.
- Known path: read directly. Trace callers, related config, tests, and nearby patterns before changing behavior.
- Reuse existing code first. Edit existing files before creating files.
- Create file only when task requires it. Never create README/docs unless explicitly asked.
- Validate changed behavior with smallest relevant command.

Return essentials only: work done, evidence, remaining blocker.`

export const GENERAL_PURPOSE_AGENT: BuiltInAgentDefinition = {
  agentType: 'general-purpose',
  whenToUse:
    'General worker for code search, investigation, implementation, and multi-step tasks. Use when no narrower agent fits.',
  tools: ['*'],
  source: 'built-in',
  baseDir: 'built-in',
  getSystemPrompt: () => GENERAL_PURPOSE_PROMPT,
}
