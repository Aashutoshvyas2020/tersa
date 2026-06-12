export type QuarantineEntry = {
  file: string
  reason: string
  owner: string
  command: string
  removalCondition: string
}

export const TERSA_QUARANTINES: QuarantineEntry[] = []

if (import.meta.main) {
  if (TERSA_QUARANTINES.length === 0) {
    console.log('PASS: no quarantined Tersa tests')
  } else {
    console.log('Tracked Tersa quarantines:')
    for (const entry of TERSA_QUARANTINES) {
      console.log(`- ${entry.file}`)
      console.log(`  reason: ${entry.reason}`)
      console.log(`  owner: ${entry.owner}`)
      console.log(`  command: ${entry.command}`)
      console.log(`  removal: ${entry.removalCondition}`)
    }
  }
}
