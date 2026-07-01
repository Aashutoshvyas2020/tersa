import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

/** Usage with nullable API fields normalized to concrete values. */
export type NonNullableUsage = {
  [Key in keyof BetaUsage]-?: NonNullable<BetaUsage[Key]>
}
