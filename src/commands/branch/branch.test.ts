import { expect, test } from 'bun:test'
import { formatBranchSuccessMessage } from './branch.js'

test('branch resume hint uses the Tersa CLI', () => {
  const message = formatBranchSuccessMessage('session-123', 'Experiment')

  expect(message).toContain('To resume the original: tersa -r session-123')
  expect(message).not.toContain('claude -r')
})
