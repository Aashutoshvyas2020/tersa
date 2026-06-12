import type { Command } from '../../commands.js'

const modes = {
  type: 'local-jsx',
  name: 'modes',
  description: 'Configure built-in Tersa modes',
  load: () => import('./modes.js'),
} satisfies Command

export default modes
