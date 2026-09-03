import { afterEach, describe, expect, test, vi } from 'vitest'

import { apiRequest, buildApiUrl } from './apiClient'
import { ApiError } from './apiErrors'

vi.mock('../../app/config/env', () => ({
  frontendConfig: { apiBaseUrl: 'https://api.example.test' },
}))

afterEach(() => vi.restoreAllMocks())

function response(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('apiRequest', () => {
  test('returns a successful JSON payload', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response('{"ok":true}'))

    await expect(apiRequest<{ ok: boolean }>('/example')).resolves.toEqual({
      ok: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/example',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    )
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Accept'),
    ).toBe('application/json')
  })

  test('returns undefined for an empty successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    await expect(apiRequest('/example')).resolves.toBeUndefined()
  })

  test('normalizes structured backend errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: ['field'],
            requestId: 'server-1',
          },
        }),
        422,
        {
          'X-Request-Id': 'header-1',
          'Retry-After': '60',
          RateLimit: 'limit=10, remaining=0, reset=60',
        },
      ),
    )

    await expect(apiRequest('/example')).rejects.toMatchObject({
      kind: 'http',
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: ['field'],
      requestId: 'server-1',
      retryAfter: '60',
      rateLimit: 'limit=10, remaining=0, reset=60',
    })
  })

  test('builds only safe API paths from the configured backend origin', () => {
    expect(buildApiUrl('/auth/google/start')).toBe(
      'https://api.example.test/api/v1/auth/google/start',
    )
    expect(() => buildApiUrl('auth/google/start')).toThrowError(ApiError)
    expect(() => buildApiUrl('//attacker.example')).toThrowError(ApiError)
  })

  test('uses the request ID header when the body has none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response('{"error":{"code":"FAILED"}}', 500, {
        'X-Request-Id': 'header-1',
      }),
    )

    await expect(apiRequest('/example')).rejects.toMatchObject({
      requestId: 'header-1',
    })
  })

  test('uses a safe fallback for malformed errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('private server detail', { status: 500 }),
    )

    const result = apiRequest('/example')
    await expect(result).rejects.toBeInstanceOf(ApiError)
    await expect(result).rejects.toMatchObject({
      status: 500,
      code: 'HTTP_ERROR',
      message: 'The request could not be completed.',
    })
  })

  test('normalizes network failures and preserves aborts', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('socket detail'),
    )
    await expect(apiRequest('/example')).rejects.toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
    })

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new DOMException('aborted', 'AbortError'),
    )
    await expect(apiRequest('/example')).rejects.toMatchObject({
      kind: 'aborted',
      code: 'REQUEST_ABORTED',
    })
  })

  test('passes an AbortSignal through to fetch', async () => {
    const controller = new AbortController()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response('{}'))

    await apiRequest('/example', { signal: controller.signal })

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
    })
  })

  test('serializes JSON bodies and leaves no-body requests without JSON content type', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => response('{}'))

    await apiRequest('/example', { method: 'POST', body: { value: 1 } })
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      body: '{"value":1}',
      credentials: 'include',
    })
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Content-Type'),
    ).toBe('application/json')

    await apiRequest('/example')
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Content-Type'),
    ).toBeNull()
  })
})
