export { getCaveModeConfig } from './config.js'
export {
  applyCaveQueryOptimizations,
  buildMemoryRecallSummary,
  buildRepoMapSummary,
} from './queryPipeline.js'
export {
  maybeRewriteBashInputWithRtk,
  resetRtkStatusForTest,
} from './rtkRewrite.js'
export {
  collapseBlankLines,
  processCaveToolResult,
  stripAnsiSequences,
  truncateToLineBudget,
} from './toolCompression.js'
export {
  getMlCompressionStatusLabel,
  hasMlCompressionSidecar,
  maybeCompressTextWithMlSidecar,
  setMlCompressionSpawnSyncImplForTest,
} from './mlCompression.js'
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
  CaveQueryOptimizationMetadata,
  RtkRewriteMetadata,
} from './types.js'
