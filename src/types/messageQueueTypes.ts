export type QueueOperation =
  | 'enqueue'
  | 'dequeue'
  | 'remove'
  | 'clear'
  | 'move'
  | string

export type QueueOperationMessage = {
  type: 'queue-operation'
  operation: QueueOperation
  content?: string
  timestamp: string
  sessionId?: string
  [key: string]: unknown
}
