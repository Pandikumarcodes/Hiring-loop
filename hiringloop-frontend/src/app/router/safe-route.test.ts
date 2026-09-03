import { describe, expect, test } from 'vitest'

import { getSafeReturnTo } from './safe-route'

describe('safe return destinations', () => {
  test('restores an internal application location', () => {
    expect(
      getSafeReturnTo({
        pathname: '/app/jobs',
        search: '?page=2',
        hash: '#open',
      }),
    ).toEqual({ pathname: '/app/jobs', search: '?page=2', hash: '#open' })
  })

  test.each([
    'https://attacker.example',
    '//attacker.example',
    'javascript:alert(1)',
    'data:text/html,attack',
    '/login',
  ])('falls back for an unsafe destination: %s', (pathname) => {
    expect(getSafeReturnTo({ pathname, search: '', hash: '' })).toBe('/app')
  })
})
