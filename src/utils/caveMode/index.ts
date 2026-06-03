export { getCaveModeConfig } from './config.js'
export {
  collapseBlankLines,
  processCaveToolResult,
  stripAnsiSequences,
  truncateToLineBudget,
} from './toolCompression.js'
export {
  compressStructuredBashOutput,
  maybeCompressJsonText,
  maybeCompressXmlText,
} from './structuredCompression.js'
export type {
  CaveCompressionMetadata,
  CaveCompressionStrategy,
  CaveModeConfig,
  CaveModeIntensity,
} from './types.js'
