/**
 * Copy command - minimal metadata only.
 * Implementation is lazy-loaded from copy.tsx to reduce startup time.
 */
import type { Command } from '../../commands.js'

const copy = {
  type: 'local-jsx',
  name: 'copy',
  description: "Copy Claude's last response to clipboard, or pick a code block",
  load: () => import('./copy.js'),
} satisfies Command

export default copy
