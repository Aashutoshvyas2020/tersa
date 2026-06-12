import type { Command } from '../commands.js'

const statusline = {
  type: 'local-jsx',
  description: "Configure Tersa's status line UI",
  aliases: [],
  name: 'statusline',
  load: () => import('./statusline-ui.js'),
} satisfies Command

export default statusline
