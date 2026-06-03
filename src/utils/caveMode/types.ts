import type { ToolUseContext } from '../../Tool.js'

export type CaveModeIntensity = 'off' | 'light' | 'full'

export type CaveModeConfig = {
  enabled: boolean
  toolCompression: boolean
  structuredCompression: boolean
  readDeduplication: boolean
  mlCompression: boolean
  intensity: CaveModeIntensity
}

export type CaveCompressionStrategy =
  | 'none'
  | 'ansi'
  | 'blank_lines'
  | 'budget'
  | 'json'
  | 'xml'
  | 'read_dedup'
  | 'combined'

export type CaveCompressionMetadata = {
  caveModeEnabled: boolean
  toolName: string
  originalChars: number
  compressedChars: number
  compressionRatio: number
  strategy: CaveCompressionStrategy
  changed: boolean
}

export type ProcessCaveToolResultArgs = {
  toolName: string
  input: unknown
  output: unknown
  toolUseId: string
  context: ToolUseContext
  isError: boolean
}

export type ProcessCaveToolResultResult = {
  output: unknown
  changed: boolean
  metadata: CaveCompressionMetadata
}

export type LineBudget = {
  maxLines: number
  headLines: number
  tailLines: number
}

export type TextCompressionResult = {
  text: string
  changed: boolean
  strategies: Exclude<CaveCompressionStrategy, 'none' | 'read_dedup'>[]
}
