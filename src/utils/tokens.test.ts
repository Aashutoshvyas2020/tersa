import { describe, expect, it, beforeEach } from 'bun:test'
import {
  getTokenCountFromUsage,
  getCurrentUsage,
  tokenCountWithEstimation,
} from './tokens.js'
import { IncrementalTokenCounter } from './incrementalTokenCounter.js'

interface FakeUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

describe('tokens', () => {
  it('ignores zero-usage assistant records when reporting current usage', () => {
    const usage = getCurrentUsage([
      {
        type: 'assistant',
        message: {
          id: 'resp_zero',
          model: 'gpt-5.4',
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          content: [{ type: 'text', text: 'hello from a completed response' }],
        },
      } as any,
    ])

    expect(usage).toBeNull()
  })

  it('falls back to message estimation when the latest assistant usage is zero', () => {
    const tokens = tokenCountWithEstimation([
      {
        type: 'assistant',
        message: {
          id: 'resp_zero',
          model: 'gpt-5.4',
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          content: [
            {
              type: 'text',
              text: 'This response should still contribute estimated tokens.',
            },
          ],
        },
      } as any,
    ])

    expect(tokens).toBeGreaterThan(0)
  })

  it('uses the last non-zero API usage when later assistant records report zero usage', () => {
    const earlierUsage = {
      input_tokens: 100,
      output_tokens: 20,
      cache_read_input_tokens: 10,
      cache_creation_input_tokens: 0,
    }

    const tokens = tokenCountWithEstimation([
      {
        type: 'assistant',
        message: {
          id: 'resp_real',
          model: 'gpt-5.4',
          usage: earlierUsage,
          content: [{ type: 'text', text: 'Earlier counted response.' }],
        },
      } as any,
      {
        type: 'assistant',
        message: {
          id: 'resp_zero',
          model: 'gpt-5.4',
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          content: [
            {
              type: 'text',
              text: 'Later response still needs to be estimated on top.',
            },
          ],
        },
      } as any,
    ])

    expect(tokens).toBeGreaterThan(getTokenCountFromUsage(earlierUsage as any))
  })
})

describe('IncrementalTokenCounter', () => {
  it('uses cached count for same message length', () => {
    const counter = new IncrementalTokenCounter()
    
    counter.getCount([
      { type: 'user', message: { content: 'hello' } } as any,
    ])
    
    expect(counter.cachedCount).toBeGreaterThan(0)
  })

  it('increments for new messages', () => {
    const counter = new IncrementalTokenCounter()
    
    const count1 = counter.getCount([
      { type: 'user', message: { content: 'hello' } } as any,
    ])
    
    const count2 = counter.getCount([
      { type: 'user', message: { content: 'hello' } } as any,
      { type: 'user', message: { content: 'world' } } as any,
    ])
    
    expect(count2).toBeGreaterThan(count1)
  })

  it('resets correctly', () => {
    const counter = new IncrementalTokenCounter()
    
    counter.getCount([{ type: 'user', message: { content: 'hello' } } as any])
    counter.reset()
    
    expect(counter.cachedCount).toBe(0)
    expect(counter.messageCount).toBe(0)
  })
})
