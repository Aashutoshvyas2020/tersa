import { describe, expect, test } from 'bun:test'
import {
  compressStructuredBashOutput,
  maybeCompressJsonText,
  maybeCompressXmlText,
} from './structuredCompression.js'

function lines(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`).join('\n')
}

describe('maybeCompressJsonText', () => {
  test('compresses large hinted json payloads', () => {
    const text = JSON.stringify(
      {
        Id: 'abc',
        Name: 'svc',
        State: { Status: 'running' },
        Config: { Image: 'nginx:latest' },
        Mounts: Array.from({ length: 40 }, (_, i) => ({ Source: `/mnt/${i}` })),
        NetworkSettings: { IPAddress: '10.0.0.2' },
      },
      null,
      2,
    )

    const result = maybeCompressJsonText(text, 'docker inspect container-id')
    expect(result.changed).toBe(true)
    expect(result.text.length).toBeLessThan(text.length)
    expect(result.text).toContain('"Id"')
    expect(result.text).toContain('"Mounts"')
  })

  test('leaves small json untouched', () => {
    const text = JSON.stringify({ ok: true }, null, 2)
    const result = maybeCompressJsonText(text, 'cat package.json')

    expect(result.changed).toBe(false)
    expect(result.text).toBe(text)
  })
})

describe('maybeCompressXmlText', () => {
  test('strips repetitive namespace boilerplate', () => {
    const text = [
      '<?xml version="1.0"?>',
      '<root xmlns:x="urn:test" xmlns:y="urn:test2">',
      ...Array.from({ length: 80 }, (_, i) => `  <x:item><y:name>name-${i}</y:name></x:item>`),
      '</root>',
    ].join('\n')

    const result = maybeCompressXmlText(text)

    expect(result.changed).toBe(true)
    expect(result.text.length).toBeLessThan(text.length)
    expect(result.text).not.toContain('xmlns:y=')
  })
})

describe('compressStructuredBashOutput', () => {
  test('returns original when compression is not meaningful', () => {
    const text = lines('plain', 55)
    const result = compressStructuredBashOutput(text, 'printf test')

    expect(result.changed).toBe(false)
    expect(result.text).toBe(text)
  })
})
