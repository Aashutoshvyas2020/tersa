import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const BASELINE_PATH = 'scripts/tersa-typecheck-baseline.json'

type Baseline = {
  errors: string[]
}

export function extractTypeScriptErrorSignatures(output: string): string[] {
  const signatures = new Set<string>()
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(.+?\(\d+,\d+\): error TS\d+):/)
    if (match) {
      signatures.add(match[1])
    }
  }
  return [...signatures].sort()
}

function readBaseline(): Baseline {
  if (!existsSync(BASELINE_PATH)) {
    return { errors: [] }
  }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline
}

function runTypecheck(): string {
  const result = spawnSync('tsc', ['--noEmit', '--pretty', 'false'], {
    encoding: 'utf8',
  })
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

if (import.meta.main) {
  const update = process.argv.includes('--update')
  const errors = extractTypeScriptErrorSignatures(runTypecheck())

  if (update) {
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify({ errors }, null, 2)}\n`,
    )
    console.log(`Updated ${BASELINE_PATH} with ${errors.length} TypeScript errors`)
    process.exit(0)
  }

  const baseline = new Set(readBaseline().errors)
  const current = new Set(errors)
  const added = [...current].filter(error => !baseline.has(error)).sort()
  const resolved = [...baseline].filter(error => !current.has(error)).sort()

  if (added.length === 0) {
    console.log(
      `PASS: TypeScript baseline held (${errors.length} current, ${resolved.length} resolved)`,
    )
    process.exit(0)
  }

  console.error(`FAIL: ${added.length} new TypeScript errors outside baseline`)
  for (const error of added.slice(0, 50)) {
    console.error(`  ${error}`)
  }
  if (added.length > 50) {
    console.error(`  ... ${added.length - 50} more`)
  }
  process.exit(1)
}
