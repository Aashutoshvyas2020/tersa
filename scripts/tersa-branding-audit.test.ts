import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  auditBranding,
  formatBrandingFindings,
} from './tersa-branding-audit.ts'

function makeTempFixture(): string {
  return mkdtempSync(join(tmpdir(), 'tersa-brand-audit-'))
}

describe('tersa branding audit', () => {
  test('flags forbidden branding in file paths and content', () => {
    const root = makeTempFixture()
    mkdirSync(join(root, 'assets', 'openclaude-icons'), { recursive: true })
    mkdirSync(join(root, 'src'), { recursive: true })

    writeFileSync(
      join(root, 'assets', 'openclaude-icons', 'logo.txt'),
      'brand asset placeholder',
    )
    writeFileSync(
      join(root, 'src', 'menu.ts'),
      'export const label = "Powered by Caveman Code";\nexport const legacy = "browser connector";\n',
    )

    const findings = auditBranding({
      rootDir: root,
    })

    expect(findings).toEqual(
      expect.arrayContaining([
        {
          kind: 'path',
          path: 'assets/openclaude-icons/logo.txt',
          pattern: 'openclaude',
        },
        {
          kind: 'content',
          path: 'src/menu.ts',
          pattern: 'caveman code',
          line: 1,
          excerpt: 'export const label = "Powered by Caveman Code";',
        },
        {
          kind: 'content',
          path: 'src/menu.ts',
          pattern: 'caveman',
          line: 1,
          excerpt: 'export const label = "Powered by Caveman Code";',
        },
        {
          kind: 'content',
          path: 'src/menu.ts',
          pattern: 'browser connector',
          line: 2,
          excerpt: 'export const legacy = "browser connector";',
        },
      ]),
    )

    expect(formatBrandingFindings(findings)).toContain(
      'FAIL path assets/openclaude-icons/logo.txt [openclaude]',
    )
  })

  test('supports allowlisted paths for unavoidable protocol internals', () => {
    const root = makeTempFixture()
    mkdirSync(join(root, 'src', 'providers'), { recursive: true })

    writeFileSync(
      join(root, 'src', 'providers', 'claude-adapter.ts'),
      'export const provider = "Anthropic";\n',
    )

    const findings = auditBranding({
      rootDir: root,
      forbiddenPatterns: [{ label: 'claude', regex: /\bclaude\b/i }],
      allowPathPatterns: [/^src\/providers\//],
    })

    expect(findings).toEqual([])
  })
})
