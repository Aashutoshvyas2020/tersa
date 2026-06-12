// Reduced inline content for the tersa-api bundled skill.
// The original markdown asset tree is absent from this source snapshot, so the
// release branch keeps a small self-contained fallback bundle here instead of
// importing missing files.

const SHARED_MODELS = `# Current Models

- Opus: {{OPUS_NAME}} (\`{{OPUS_ID}}\`)
- Sonnet: {{SONNET_NAME}} (\`{{SONNET_ID}}\`)
- Haiku: {{HAIKU_NAME}} (\`{{HAIKU_ID}}\`)

Prefer canonical model IDs in API requests and config.`

const SHARED_TOOL_USE = `# Tool Use Concepts

- Declare tool schemas explicitly.
- Return structured tool results.
- Keep tool prompts deterministic and narrowly scoped.`

const SHARED_PROMPT_CACHING = `# Prompt Caching

- Cache large stable prefixes.
- Separate volatile user turns from reusable instructions.
- Measure cache-hit behavior per provider.`

const SHARED_ERROR_CODES = `# Error Handling

- Validate auth and model IDs first.
- Retry only transient network and rate-limit failures.
- Surface provider-specific status details in logs and user messages.`

const SHARED_LIVE_SOURCES = `# Live Sources

- Check provider docs for current pricing, quotas, and model availability.
- Do not hardcode recently changing operational limits without verification.`

const languageGuide = (language: string) => `# ${language} API Quickstart

Use the Anthropic-compatible Tersa API helpers in this repo as the reference
surface for ${language}. Start with one request, then add streaming, tool use,
and prompt caching as needed.`

export const SKILL_MODEL_VARS = {
  OPUS_ID: 'claude-opus-4-6',
  OPUS_NAME: 'Claude Opus 4.6',
  SONNET_ID: 'claude-sonnet-4-6',
  SONNET_NAME: 'Claude Sonnet 4.6',
  HAIKU_ID: 'claude-haiku-4-5',
  HAIKU_NAME: 'Claude Haiku 4.5',
  PREV_SONNET_ID: 'claude-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT = `Use the bundled reference docs below to answer
API questions. Prefer the language-specific README first, then the shared docs
for models, prompt caching, tool use, and error handling.`

export const SKILL_FILES: Record<string, string> = {
  'python/claude-api/README.md': languageGuide('Python'),
  'typescript/claude-api/README.md': languageGuide('TypeScript'),
  'java/claude-api/README.md': languageGuide('Java'),
  'go/claude-api/README.md': languageGuide('Go'),
  'ruby/claude-api.md': languageGuide('Ruby'),
  'php/claude-api.md': languageGuide('PHP'),
  'csharp/claude-api.md': languageGuide('C#'),
  'curl/examples.md': languageGuide('curl'),
  'shared/models.md': SHARED_MODELS,
  'shared/tool-use-concepts.md': SHARED_TOOL_USE,
  'shared/prompt-caching.md': SHARED_PROMPT_CACHING,
  'shared/error-codes.md': SHARED_ERROR_CODES,
  'shared/live-sources.md': SHARED_LIVE_SOURCES,
}
