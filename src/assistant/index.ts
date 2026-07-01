import type { AppState } from '../state/AppState.js'

let assistantForced = false

export function markAssistantForced(): void {
  assistantForced = true
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export function isAssistantMode(): boolean {
  return assistantForced
}

export async function initializeAssistantTeam(): Promise<
  AppState['teamContext'] | undefined
> {
  return undefined
}

export function getAssistantSystemPromptAddendum(): string {
  return ''
}

export function getAssistantActivationPath(): string | undefined {
  return undefined
}
