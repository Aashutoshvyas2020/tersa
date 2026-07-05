import { expect, test } from 'bun:test'
import { ensureTersaBranchPrefix } from './teleport.js'

test('generated session branches always use the Tersa prefix', () => {
  expect(ensureTersaBranchPrefix('claude/fix-login')).toBe('tersa/fix-login')
  expect(ensureTersaBranchPrefix('tersa/fix-login')).toBe('tersa/fix-login')
  expect(ensureTersaBranchPrefix('fix-login')).toBe('tersa/fix-login')
  expect(ensureTersaBranchPrefix('')).toBe('tersa/task')
})
