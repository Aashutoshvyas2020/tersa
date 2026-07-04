import { test } from 'bun:test'
import { resolveModelPickerLayout } from './ModelPicker.js'

test('picker layout', () => {
  if (resolveModelPickerLayout(60) !== 'compact-vertical') throw new Error('narrow layout')
  if (resolveModelPickerLayout(80) !== 'compact-vertical') throw new Error('standard layout')
  if (resolveModelPickerLayout(100) !== 'compact') throw new Error('wide layout')
})
