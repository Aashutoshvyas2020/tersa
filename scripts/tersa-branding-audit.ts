import { readdirSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'

export type BrandingPattern = {
  label: string
  regex: RegExp
}

export type BrandingFinding = {
  path: string
  kind: 'path' | 'content'
  pattern: string
  line?: number
  excerpt?: string
}

export type BrandingAuditOptions = {
  rootDir: string
  includePaths?: string[]
  forbiddenPatterns?: BrandingPattern[]
  ignorePathPatterns?: RegExp[]
  allowPathPatterns?: RegExp[]
  maxFileBytes?: number
}

const LEGACY_OPEN_PRODUCT = ['open', 'claude'].join('')
const LEGACY_OPEN_PRODUCT_WORDS = ['open', 'claude'].join(' ')
const LEGACY_SCOPED_PACKAGE = ['@gitlawb/', LEGACY_OPEN_PRODUCT].join('')
const LEGACY_CLAUDE_CODE = ['claude', 'code'].join(' ')

export const DEFAULT_FORBIDDEN_BRANDING_PATTERNS: BrandingPattern[] = [
  { label: LEGACY_SCOPED_PACKAGE, regex: new RegExp(LEGACY_SCOPED_PACKAGE.replace('/', '\\/'), 'i') },
  { label: LEGACY_OPEN_PRODUCT, regex: new RegExp(`\\b${LEGACY_OPEN_PRODUCT}\\b`, 'i') },
  { label: LEGACY_OPEN_PRODUCT_WORDS, regex: /\bopen\s+claude\b/i },
  { label: LEGACY_CLAUDE_CODE, regex: /\bclaude\s+code\b/i },
  { label: 'caveman code', regex: /\bcaveman\s+code\b/i },
  { label: 'caveman', regex: /\bcaveman\b/i },
  { label: 'browser connector', regex: /\bbrowser\s+connector\b/i },
]

const DEFAULT_IGNORE_PATH_PATTERNS = [
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /(^|\/)coverage\//,
  /(^|\/)\.next\//,
  /(^|\/)\.turbo\//,
]

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.jsx',
  '.mjs',
  '.md',
  '.proto',
  '.sh',
  '.svg',
  '.test.ts',
  '.test.tsx',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
])

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}

function shouldIgnorePath(path: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(path))
}

function shouldAllowPath(path: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(path))
}

function looksLikeTextFile(path: string): boolean {
  for (const extension of TEXT_EXTENSIONS) {
    if (path.endsWith(extension)) return true
  }
  return false
}

function walkFiles(rootDir: string, startPaths: string[], ignorePatterns: RegExp[]): string[] {
  const discovered = new Set<string>()

  function visit(targetPath: string): void {
    const normalized = normalizePath(targetPath)
    if (shouldIgnorePath(normalized, ignorePatterns)) return

    const stat = statSync(targetPath)
    if (stat.isDirectory()) {
      for (const entry of readdirSync(targetPath)) {
        visit(join(targetPath, entry))
      }
      return
    }

    if (stat.isFile()) {
      discovered.add(targetPath)
    }
  }

  for (const includePath of startPaths) {
    visit(isAbsolute(includePath) ? includePath : join(rootDir, includePath))
  }

  return Array.from(discovered).sort()
}

function findLineInfo(text: string, matchIndex: number): { line: number; excerpt: string } {
  const lines = text.split('\n')
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const nextOffset = offset + line.length + 1
    if (matchIndex < nextOffset) {
      return { line: i + 1, excerpt: line.trim() }
    }
    offset = nextOffset
  }
  return { line: lines.length, excerpt: lines.at(-1)?.trim() ?? '' }
}

export function auditBranding(options: BrandingAuditOptions): BrandingFinding[] {
  const forbiddenPatterns =
    options.forbiddenPatterns ?? DEFAULT_FORBIDDEN_BRANDING_PATTERNS
  const ignorePathPatterns = [
    ...DEFAULT_IGNORE_PATH_PATTERNS,
    ...(options.ignorePathPatterns ?? []),
  ]
  const allowPathPatterns = options.allowPathPatterns ?? []
  const includePaths = options.includePaths?.length ? options.includePaths : ['.']
  const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024
  const findings: BrandingFinding[] = []

  for (const absolutePath of walkFiles(options.rootDir, includePaths, ignorePathPatterns)) {
    const repoRelativePath = normalizePath(relative(options.rootDir, absolutePath))
    const pathAllowed = shouldAllowPath(repoRelativePath, allowPathPatterns)

    for (const pattern of forbiddenPatterns) {
      if (!pathAllowed && pattern.regex.test(repoRelativePath)) {
        findings.push({
          path: repoRelativePath,
          kind: 'path',
          pattern: pattern.label,
        })
      }
      pattern.regex.lastIndex = 0
    }

    if (pathAllowed || !looksLikeTextFile(repoRelativePath)) continue

    const stat = statSync(absolutePath)
    if (stat.size > maxFileBytes) continue

    const text = readFileSync(absolutePath, 'utf8')
    for (const pattern of forbiddenPatterns) {
      const match = pattern.regex.exec(text)
      if (match?.index !== undefined) {
        const lineInfo = findLineInfo(text, match.index)
        findings.push({
          path: repoRelativePath,
          kind: 'content',
          pattern: pattern.label,
          line: lineInfo.line,
          excerpt: lineInfo.excerpt,
        })
      }
      pattern.regex.lastIndex = 0
    }
  }

  return findings.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path)
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.pattern.localeCompare(b.pattern)
  })
}

export function formatBrandingFindings(findings: BrandingFinding[]): string {
  if (findings.length === 0) {
    return 'PASS: no forbidden branding found'
  }

  return findings
    .map(finding => {
      const location = finding.line ? `${finding.path}:${finding.line}` : finding.path
      const excerpt = finding.excerpt ? ` :: ${finding.excerpt}` : ''
      return `FAIL ${finding.kind} ${location} [${finding.pattern}]${excerpt}`
    })
    .join('\n')
}

function parseArgs(argv: string[]): { json: boolean; includePaths: string[] } {
  const includePaths: string[] = []
  let json = false

  for (const arg of argv) {
    if (arg === '--json') {
      json = true
      continue
    }
    includePaths.push(arg)
  }

  return { json, includePaths }
}

if (import.meta.main) {
  const { json, includePaths } = parseArgs(process.argv.slice(2))
  const findings = auditBranding({
    rootDir: process.cwd(),
    includePaths,
  })

  if (json) {
    console.log(JSON.stringify({ findings }, null, 2))
  } else {
    console.log(formatBrandingFindings(findings))
  }

  process.exit(findings.length === 0 ? 0 : 1)
}
