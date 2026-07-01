import type { ZodRawShape, ZodTypeAny, infer as ZodInfer } from 'zod'

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export type {
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionInfoOptions,
  GetSessionMessagesOptions,
  ListSessionsOptions,
  SessionMessage,
  SessionMutationOptions,
} from './shared.js'
export type { Query } from './query.js'
export type {
  SDKSession,
  SDKSessionOptions,
  SdkMcpToolDefinition,
} from './v2.js'

export type Options = import('./query.js').QueryOptions
export type InternalOptions = Options
export type InternalQuery = import('./query.js').Query

export type AnyZodRawShape = ZodRawShape
export type InferShape<Shape extends AnyZodRawShape> = {
  [Key in keyof Shape]: Shape[Key] extends ZodTypeAny
    ? ZodInfer<Shape[Key]>
    : never
}
