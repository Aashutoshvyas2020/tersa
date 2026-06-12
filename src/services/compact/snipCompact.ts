// Stub — snipCompact not included in source snapshot.
// Keep the no-op surface explicit so callers can compile without enabling the
// missing feature.
export function snipCompact() {
  return null
}

export function isSnipRuntimeEnabled(): boolean {
  return false
}

export function shouldNudgeForSnips(_messages?: unknown): boolean {
  return false
}
