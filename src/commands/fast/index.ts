import type { Command } from '../../commands.js'
import { FAST_MODE_MODEL_DISPLAY } from '../../utils/fastMode.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'

const fast = {
  type: 'local-jsx',
  name: 'fast',
  get description() {
    return `Toggle fast mode (${FAST_MODE_MODEL_DISPLAY} only)`
  },
  argumentHint: '[on|off]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./publicFast.js'),
} satisfies Command

export default fast
