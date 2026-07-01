type ProactiveActivationSource = 'command' | string

type Listener = () => void

export function isProactiveActive(): boolean {
  return false
}

export function isProactivePaused(): boolean {
  return false
}

export function activateProactive(_source: ProactiveActivationSource): void {}
export function deactivateProactive(): void {}
export function pauseProactive(): void {}
export function resumeProactive(): void {}
export function setContextBlocked(_blocked: boolean): void {}

export function subscribeToProactiveChanges(_listener: Listener): () => void {
  return () => {}
}
