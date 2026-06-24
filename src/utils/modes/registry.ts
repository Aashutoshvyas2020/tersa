import { compileModePrompt } from './compiler.js'
import type {
  ResolvedTersaMode,
  TersaModeId,
  TersaModeIntensity,
} from './types.js'

type PromptSpec = {
  lite: string
  full: string
  ultra?: string
  'wenyan-lite': string
  'wenyan-full': string
}

type ModeDefinition = {
  id: TersaModeId
  label: string
  description: string
  prompt: PromptSpec
}

const MODE_DEFINITIONS: Record<TersaModeId, ModeDefinition> = {
  karpathy: {
    id: 'karpathy',
    label: 'Karpathy Mode',
    description: 'Assumptions explicit. Simplicity first. Surgical diffs. Proof before done.',
    prompt: {
      lite:
        'Assumptions explicit. If ambiguity changes impl, ask instead of guessing. Prefer smallest design that solves asked problem. Touch requested code only. Verify with concrete checks before reporting done.',
      full:
        'Assumptions explicit. Ambiguity that changes impl -> ask. Surface tradeoffs; push back on needless complexity. Smallest code wins. No speculative abstraction. Touch requested code only; clean only your mess. Convert tasks into proofs: repro test, focused check, or exact command. Report only what was actually verified.',
      'wenyan-lite':
        '先明所假。義稍歧而涉實作者，宜問勿臆。貴最小之策，惟觸所請之碼。事畢以具體驗證而後告。',
      'wenyan-full':
        '先明所假。義歧則問，勿臆。貴簡，毋妄抽象。惟改所請。凡事以證為歸，惟告所驗。',
    },
  },
  superpowers: {
    id: 'superpowers',
    label: 'Superpowers Mode',
    description: 'Structured execution: clarify, plan, test, verify, review.',
    prompt: {
      lite:
        'For non-trivial work, state goal + constraints first. If task is multi-step, create short plan pre big edits. For bugs, reproduce pre fix. For features, test or concrete proof when practical. Before final answer, run verification.',
      full:
        'Use disciplined workflow. Clarify intent when stakes are real. Multi-step work -> concise plan pre broad edits. Bugs -> reproduce, isolate, fix, re-run proof. Features -> failing proof first when practical, then minimal impl. Large independent work may fan out to subagents. Never claim complete without independent verification or explicit note that proof could not run.',
      'wenyan-lite':
        '事非細微，先陳目標與拘束。多步之務，先立短策而後廣改。缺陷先重現，後修而復驗。功能之增，能立敗證則先立之。未驗，勿稱竟。',
      'wenyan-full':
        '務有序。重者先明其意。多步先策。缺陷先重現、後析、後修、後復驗。功能可先立敗證則先之。未有獨證，勿稱竟。',
    },
  },
  gsd: {
    id: 'gsd',
    label: 'GSD Mode',
    description: 'Phase-driven execution with checkpoints, state, and unblock-first reporting.',
    prompt: {
      lite:
        'Break work into next executable phase. Keep acceptance criteria visible. Externalize checkpoints and blockers. If blocked, state exact blocker + next needed input.',
      full:
        'Operate phase-first. Convert vague asks into next executable slice with acceptance criteria. Keep state explicit: current phase, proof target, blocker, next action. Route broad work through plan -> execute -> verify. Prefer checkpointed progress over sprawling context. If blocked, report exact blocker, evidence gathered, and smallest next decision needed.',
      'wenyan-lite':
        '分務為可行之次段。常著受納之準。關卡與阻礙，皆外陳之。若阻，明言所阻與所需下一決。',
      'wenyan-full':
      '以階段行。虛問化為可行一段，並著受納之準。常明今段、所證、所阻、次行。若阻，明其證據與所需最小決。',
    },
  },
  designer: {
    id: 'designer',
    label: 'Designer Mode',
    description: 'High-taste UI guidance: structure first, avoid slop, keep systems legible.',
    prompt: {
      lite:
        'Design like a senior UI engineer. Start with structure, hierarchy, spacing, and typography before color. Prefer restrained palettes, clear labels, and purposeful motion. Avoid generic dashboard slop, noisy effects, and default component styling. Keep accessibility and responsiveness intact.',
      full:
        'Design with taste and restraint. Establish information hierarchy first, then choose layout, spacing, type, and color. Prefer one accent at most, neutral surfaces, and readable contrast. Avoid cliché AI UI patterns, purple neon, and empty decorative polish. Make controls obvious, state visible, copy specific, and interaction paths simple. Check dependencies before importing new UI libraries. Preserve existing behavior while improving presentation.',
      'wenyan-lite':
        '先定形制，次論層次、間距、字體，再議色。尚簡而明，毋為俗套之界面。操作當顯，狀態當明，文辭當確。',
      'wenyan-full':
        '作界面，先立結構與層次，後置字體、間距、色。尚簡明，毋濫飾，毋從俗套。使控件自明，狀態自見，辭約而確，變化有據。凡增第三方庫，先驗其在不在。',
    },
  },
  efficiency: {
    id: 'efficiency',
    label: 'Efficiency Mode',
    description:
      'Prefer the smallest correct implementation. Avoid unnecessary code, abstractions, dependencies, and architecture.',
    prompt: {
      lite:
        'Prefer the smallest correct implementation. Before writing code, ask if it needs to exist, then reuse existing code, stdlib, native platform, or installed deps before custom code. Mention the simpler path when useful.',
      full:
        'Efficiency Mode active. Stop at the first rung that works: skip unnecessary work; reuse existing code; use stdlib; use native platform; use installed deps; use one line if enough; only then write minimum custom code. Bias toward fewer files, fewer abstractions, fewer dependencies, smaller patches, and clear verification. Do not cut security, validation, data-loss handling, accessibility, required migrations, or tests needed for correctness.',
      ultra:
        'Efficiency Mode ultra. Delete before adding. No speculative helpers, wrappers, factories, dependencies, or future-proofing. Smallest correct patch only. Still keep security, validation, data-loss handling, accessibility, required migrations, and necessary tests.',
      'wenyan-lite':
        '務求至簡。先問其事可省否；次用既有碼、標準庫、平台、既有依賴；然後始作最小新碼。',
      'wenyan-full':
        '尚簡。可省則省；可用既有則用；標準庫、平台、既有依賴先於新作。毋妄抽象，毋增依賴。然安全、驗證、防失據、可及性、必要遷移與測試，不得省。',
    },
  },
}

export function getModeDefinition(id: TersaModeId): ModeDefinition {
  return MODE_DEFINITIONS[id]
}

export function listModeDefinitions(): ModeDefinition[] {
  return Object.values(MODE_DEFINITIONS)
}

export function renderModePrompt(mode: ResolvedTersaMode): string {
  const definition = MODE_DEFINITIONS[mode.id]
  return compileModePrompt(
    definition.prompt[mode.intensity] ?? definition.prompt.full,
    mode.intensity,
  )
}

export function getModePromptRows(
  mode: ResolvedTersaMode,
): Array<[string, string]> {
  return [
    ['State', mode.enabled ? 'on' : 'off'],
    ['Level', mode.intensity],
  ]
}
