import { describe, expect, test } from 'vitest'

import { normalizeApiBaseUrl } from './env'

describe('frontend environment configuration', () => {
  test('normalizes a backend origin and trailing slash', () => {
    expect(normalizeApiBaseUrl(' https://api.example.test/ ')).toBe(
      'https://api.example.test',
    )
  })

  test('rejects API paths because the client owns /api/v1', () => {
    expect(() =>
      normalizeApiBaseUrl('https://api.example.test/api/v1'),
    ).toThrow()
  })

  test('rejects any non-origin path', () => {
    expect(() =>
      normalizeApiBaseUrl('https://api.example.test/service'),
    ).toThrow()
  })

  test('allows the API URL to be absent until a request is made', () => {
    expect(normalizeApiBaseUrl(undefined)).toBeUndefined()
  })
})
