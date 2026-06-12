import { getCaveModeConfig } from './caveMode/config.js'

export type InternalPromptCompressionStyle =
  | 'lite'
  | 'full'
  | 'wenyan-lite'
  | 'wenyan-full'

type TextBlockLike = {
  type: string
  text?: string
}

const BASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdo not\b/gi, 'no'],
  [/\bbefore\b/gi, 'pre'],
  [/\bafter\b/gi, 'post'],
  [/\bwith\b/gi, 'w/'],
  [/\bwithout\b/gi, 'w/o'],
  [/\band\b/gi, ' + '],
  [/\bverify\b/gi, 'prove'],
  [/\bverification\b/gi, 'proof'],
  [/\bimplementation\b/gi, 'impl'],
  [/\bquestion(s)?\b/gi, 'ask$1'],
  [/\bclarification\b/gi, 'clarify'],
]

const FULL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\binstead of\b/gi, 'not'],
  [/\bprefer\b/gi, 'prefer'],
  [/\buse\b/gi, 'use'],
  [/\bcurrent\b/gi, 'cur'],
  [/\bminimum\b/gi, 'min'],
  [/\bmaximum\b/gi, 'max'],
  [/\bmessage\b/gi, 'msg'],
  [/\bmessages\b/gi, 'msgs'],
  [/\bcontext\b/gi, 'ctx'],
  [/\bresponse\b/gi, 'resp'],
]

const WENYAN_LITE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdo not\b/gi, '勿'],
  [/\bbefore\b/gi, '先'],
  [/\bafter\b/gi, '後'],
  [/\bwith\b/gi, '以'],
  [/\bwithout\b/gi, '毋'],
  [/\band\b/gi, '、'],
  [/\bverify\b/gi, '驗'],
  [/\bverification\b/gi, '驗證'],
  [/\bimplementation\b/gi, '實作'],
  [/\bquestion(s)?\b/gi, '問$1'],
  [/\bclarify\b/gi, '明之'],
  [/\bassumptions?\b/gi, '所假'],
  [/\bexplicit\b/gi, '明'],
  [/\bambiguity\b/gi, '歧義'],
  [/\bask\b/gi, '問'],
  [/\bguess\b/gi, '臆'],
  [/\bsmallest\b/gi, '最小'],
  [/\bcode\b/gi, '碼'],
  [/\bonly\b/gi, '惟'],
  [/\breport\b/gi, '告'],
  [/\bcomplete\b/gi, '竟'],
  [/\bproof\b/gi, '證'],
  [/\bplan\b/gi, '策'],
  [/\bbugs?\b/gi, '缺陷'],
  [/\bfeature(s)?\b/gi, '功能$1'],
]

const WENYAN_FULL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bif\b/gi, '若'],
  [/\bthen\b/gi, '則'],
  [/\bmust\b/gi, '須'],
  [/\bshould\b/gi, '宜'],
  [/\bcan not\b/gi, '不能'],
  [/\bcannot\b/gi, '不能'],
  [/\bwhen\b/gi, '及'],
  [/\bwhere\b/gi, '所'],
  [/\bthis\b/gi, '此'],
  [/\bthat\b/gi, '彼'],
  [/\bcurrent\b/gi, '今'],
  [/\bcontext\b/gi, '境'],
  [/\bmessage(s)?\b/gi, '訊$1'],
  [/\bresponse\b/gi, '應'],
  [/\btoken(s)?\b/gi, '詞元$1'],
  [/\bskill(s)?\b/gi, '技$1'],
  [/\bmode(s)?\b/gi, '式$1'],
]

function applyReplacementSet(text: string, rules: Array<[RegExp, string]>): string {
  let next = text
  for (const [pattern, replacement] of rules) {
    next = next.replace(pattern, replacement)
  }
  return next
}

function compressPlainSegment(
  text: string,
  style: InternalPromptCompressionStyle,
): string {
  let next = applyReplacementSet(text, BASE_REPLACEMENTS)

  if (style === 'full' || style === 'wenyan-lite' || style === 'wenyan-full') {
    next = applyReplacementSet(next, FULL_REPLACEMENTS)
  }
  if (style === 'wenyan-lite' || style === 'wenyan-full') {
    next = applyReplacementSet(next, WENYAN_LITE_REPLACEMENTS)
  }
  if (style === 'wenyan-full') {
    next = applyReplacementSet(next, WENYAN_FULL_REPLACEMENTS)
    next = next
      .replace(/\b[Aa]ssumptions explicit\./g, '先明所假。')
      .replace(/所假 明\./g, '先明所假。')
      .replace(
        /\b[Aa]mbiguity that changes impl -> ask\./g,
        '義有歧而變實作者，先問。',
      )
      .replace(/若 歧義 changes impl, 問 not guessing\./g, '義有歧而變實作者，先問，毋臆。')
      .replace(/\b[Ss]mallest code wins\./g, '貴簡。')
      .replace(/\b[Rr]eport only what was actually verified\./g, '惟告所驗。')
  }

  return next
}

function isProtectedSegment(segment: string): boolean {
  return (
    segment.startsWith('```') ||
    (segment.startsWith('`') && segment.endsWith('`'))
  )
}

export function compressInternalPromptText(
  text: string,
  style: InternalPromptCompressionStyle,
): string {
  if (!text.trim()) return text.trim()

  const segments = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g)
  const transformed = segments.map(segment =>
    !segment || isProtectedSegment(segment)
      ? segment
      : compressPlainSegment(segment, style),
  )

  return transformed
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function compressTextBlocks<T extends TextBlockLike>(
  blocks: T[],
  style: InternalPromptCompressionStyle,
): T[] {
  let changed = false
  const next = blocks.map(block => {
    if (block.type !== 'text' || typeof block.text !== 'string') {
      return block
    }
    const compressed = compressInternalPromptText(block.text, style)
    if (compressed === block.text) {
      return block
    }
    changed = true
    return { ...block, text: compressed }
  })
  return changed ? next : blocks
}

export function getSkillPromptCompressionStyle(): InternalPromptCompressionStyle {
  const configured = getCaveModeConfig().skillPromptCompressionStyle
  return configured ?? 'full'
}

export function isSkillPromptCompressionEnabled(): boolean {
  const configured = getCaveModeConfig().skillPromptCompression
  return configured ?? true
}
