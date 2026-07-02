import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { KnowledgeGraph } from '../knowledgeGraph.js'
import { SQLiteProvider } from './SQLiteProvider.js'

function graphWith(name: string): KnowledgeGraph {
  const timestamp = Date.now()
  return {
    entities: {
      [name]: {
        id: name,
        type: 'tool',
        name,
        attributes: { status: 'durable' },
      },
    },
    relations: [],
    summaries: [],
    rules: [],
    lastUpdateTime: timestamp,
  }
}

describe('legacy SQLite knowledge-graph provider', () => {
  let projectDir = ''
  let provider: SQLiteProvider | undefined

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'tersa-legacy-sqlite-'))
  })

  afterEach(() => {
    provider?.close()
    provider = undefined
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('persists and reloads a legacy graph for JSON migration', async () => {
    provider = new SQLiteProvider(projectDir)
    await provider.init()
    expect(provider.isReady).toBe(true)

    const expected = graphWith('legacy-memory')
    provider.saveGraph(expected)
    expect(existsSync(join(projectDir, 'knowledge.db'))).toBe(true)
    provider.close()

    provider = new SQLiteProvider(projectDir)
    await provider.init()
    const loaded = provider.loadGraph()

    expect(loaded?.entities['legacy-memory']).toEqual(
      expected.entities['legacy-memory'],
    )
    expect(loaded?.lastUpdateTime).toBe(expected.lastUpdateTime)
  })

  it('recreates a corrupt legacy database as an empty valid database', async () => {
    const sqlitePath = join(projectDir, 'knowledge.db')
    writeFileSync(sqlitePath, Buffer.from('NOT_SQLITE_BINARY'))

    const originalError = console.error
    console.error = () => {}
    try {
      provider = new SQLiteProvider(projectDir)
      await provider.init()
    } finally {
      console.error = originalError
    }

    expect(provider?.isReady).toBe(true)
    expect(existsSync(sqlitePath)).toBe(true)
    expect(provider?.loadGraph()).toBeNull()
  })

  it('clears a closed on-disk legacy database', async () => {
    provider = new SQLiteProvider(projectDir)
    await provider.init()
    provider.saveGraph(graphWith('to-clear'))
    provider.close()

    const closedProvider = new SQLiteProvider(projectDir)
    expect(closedProvider.clear()).toBe(true)
    await closedProvider.init()
    expect(closedProvider.loadGraph()).toBeNull()
    closedProvider.close()
  })
})
