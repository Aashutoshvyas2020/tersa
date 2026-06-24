import type { Command } from '../../commands.js'

const theme = {
  type: 'local-jsx',
  name: 'theme',
  description: 'Change the theme or prompt bar color',
  argumentHint: '[color <color|default>]',
  load: () => import('./theme.js'),
} satisfies Command

export default theme
