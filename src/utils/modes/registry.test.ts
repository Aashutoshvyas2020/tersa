import { test } from 'bun:test'
import { listModeDefinitions } from './registry.js'

test('mode registry includes every visible mode', () => {
  if (listModeDefinitions().length !== 6) {
    throw new Error('expected six visible modes')
  }
})
