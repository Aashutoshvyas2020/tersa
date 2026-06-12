// Stub
import React from 'react'
export function SnapshotUpdateDialog(_props: unknown) { return null }

export function buildMergePrompt(agentType: string, scope: string): string {
  return `Merge the pending ${agentType} memory snapshot for ${scope}.`
}
