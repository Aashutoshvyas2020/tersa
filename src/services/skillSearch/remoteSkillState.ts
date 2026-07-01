export type DiscoveredRemoteSkill = {
  url: string
}

const CANONICAL_PREFIX = '_canonical_'

export function stripCanonicalPrefix(name: string): string | null {
  return name.startsWith(CANONICAL_PREFIX)
    ? name.slice(CANONICAL_PREFIX.length)
    : null
}

export function getDiscoveredRemoteSkill(
  _slug: string,
): DiscoveredRemoteSkill | undefined {
  return undefined
}
