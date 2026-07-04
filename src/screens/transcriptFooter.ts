type TranscriptFooterOptions = {
  columns: number
  toggleShortcut: string
  showAllShortcut: string
  showAllInTranscript: boolean
  virtualScroll: boolean
  searchBadge: boolean
  suppressShowAll: boolean
}

export function formatTranscriptFooter({
  columns,
  toggleShortcut,
  showAllShortcut,
  showAllInTranscript,
  virtualScroll,
  searchBadge,
  suppressShowAll,
}: TranscriptFooterOptions): string {
  if (columns <= 60) {
    const base = `Transcript · ${toggleShortcut} toggle`
    if (searchBadge) return `${base} · n/N navigate`
    if (virtualScroll) return `${base} · ↑↓ scroll · home/end`
    if (suppressShowAll) return base
    return `${base} · ${showAllShortcut} ${showAllInTranscript ? 'collapse' : 'show all'}`
  }

  const suffix = searchBadge
    ? ' · n/N to navigate'
    : virtualScroll
      ? ' · ↑↓ scroll · home/end top/bottom'
      : suppressShowAll
        ? ''
        : ` · ${showAllShortcut} to ${showAllInTranscript ? 'collapse' : 'show all'}`

  return `Showing detailed transcript · ${toggleShortcut} to toggle${suffix}`
}
