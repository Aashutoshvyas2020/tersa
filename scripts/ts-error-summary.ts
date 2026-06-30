import { spawnSync } from 'node:child_process'

const tscPath =
  process.platform === 'win32'
    ? 'node_modules/.bin/tsc.cmd'
    : 'node_modules/.bin/tsc'
const result = spawnSync(tscPath, ['--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
})
if (result.error) throw result.error
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
const counts = new Map<string, number>()
const codes = new Map<string, number>()
const missingModules = new Map<string, number>()
const detailFilter = process.argv[2]
let total = 0

if (detailFilter && detailFilter !== '--missing') {
  console.log(
    output
      .split(/\r?\n/)
      .filter(line => line.includes(detailFilter))
      .join('\n'),
  )
  process.exit(result.status ?? 1)
}

for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+):/)
  if (!match) continue
  total += 1
  counts.set(match[1], (counts.get(match[1]) ?? 0) + 1)
  codes.set(match[2], (codes.get(match[2]) ?? 0) + 1)
  const missingModule = line.match(/Cannot find module '([^']+)'/)
  if (missingModule) {
    missingModules.set(
      missingModule[1],
      (missingModules.get(missingModule[1]) ?? 0) + 1,
    )
  }
}

if (detailFilter === '--missing') {
  for (const [moduleName, count] of [...missingModules].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`${String(count).padStart(4)}  ${moduleName}`)
  }
  process.exit(result.status ?? 1)
}

console.log(`Total TypeScript errors: ${total}`)
console.log('\nBy file:')
for (const [file, count] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${file}`)
}
console.log('\nBy code:')
for (const [code, count] of [...codes].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${code}`)
}
console.log('\nMissing modules:')
for (const [moduleName, count] of [...missingModules].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`${String(count).padStart(4)}  ${moduleName}`)
}
process.exit(result.status ?? 1)
