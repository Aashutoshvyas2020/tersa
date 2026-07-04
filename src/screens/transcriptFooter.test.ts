import { describe, expect, test } from 'bun:test'
import { formatTranscriptFooter } from './transcriptFooter.js'

describe('formatTranscriptFooter', () => {
  test('uses a compact one-line guide at 60 columns', () => {
    const output = formatTranscriptFooter({
      columns: 60,
      toggleShortcut: 'ctrl+o',
      showAllShortcut: 'ctrl+e',
      showAllInTranscript: false,
      virtualScroll: false,
      searchBadge: false,
      suppressShowAll: false,
    })

    expect(output).toBe('Transcript · ctrl+o toggle · ctrl+e show all')
    expect(output.length).toBeLessThanOrEqual(58)
  })

  test('preserves the descriptive wide guide', () => {
    expect(
      formatTranscriptFooter({
        columns: 80,
        toggleShortcut: 'ctrl+o',
        showAllShortcut: 'ctrl+e',
        showAllInTranscript: true,
        virtualScroll: false,
        searchBadge: false,
        suppressShowAll: false,
      }),
    ).toBe(
      'Showing detailed transcript · ctrl+o to toggle · ctrl+e to collapse',
    )
  })
})
