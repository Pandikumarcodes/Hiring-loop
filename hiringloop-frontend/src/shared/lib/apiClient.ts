import { frontendConfig } from '../../app/config/env'
import { ApiError } from './apiErrors'
import type { JsonValue } from '../types'

const API_PREFIX = '/api/v1'
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  readonly body?: BodyInit | JsonValue
  readonly headers?: HeadersInit
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function safeRequestId(value: unknown): string | undefined {
  const candidate = safeString(value)
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : undefined
}

type JsonBody = Exclude<JsonValue, string>

function isStructuredJsonBody(body: BodyInit | JsonValue): body is JsonBody {
  return (
    body === null ||
    typeof body === 'number' ||
    typeof body === 'boolean' ||
    (typeof body === 'object' &&
      !(body instanceof Blob) &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof ArrayBuffer))
  )
}

export function buildApiUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiError({
      kind: 'configuration',
      code: 'INVALID_API_PATH',
      message:
        'API paths must be relative paths beginning with a single slash.',
    })
  }

  const baseUrl = frontendConfig.apiBaseUrl
  if (!baseUrl) {
    throw new ApiError({
      kind: 'configuration',
      code: 'API_BASE_URL_MISSING',
      message: 'The frontend API base URL is not configured.',
    })
  }

  return `${baseUrl}${API_PREFIX}${path}`
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text.trim()) {
    return undefined
  }

  if (response.headers.get('content-type')?.includes('json')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  }

  return text
}

function makeHttpError(
  status: number,
  body: unknown,
  headers: Headers,
): ApiError {
  const fallbackRequestId = safeRequestId(headers.get('X-Request-Id'))
  const envelope =
    isRecord(body) && isRecord(body.error) ? body.error : undefined
  const code = safeString(envelope?.code) ?? 'HTTP_ERROR'
  const message =
    safeString(envelope?.message) ?? 'The request could not be completed.'
  const requestId = safeRequestId(envelope?.requestId) ?? fallbackRequestId

  return new ApiError({
    kind: 'http',
    status,
    code,
    message,
    details: envelope?.details,
    requestId,
    retryAfter: safeString(headers.get('Retry-After')),
    rateLimit: safeString(headers.get('RateLimit')),
  })
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse | undefined> {
  const { body, headers: callerHeaders, ...requestInit } = options
  const headers = new Headers(callerHeaders)
  headers.set('Accept', headers.get('Accept') ?? 'application/json')

  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    if (isStructuredJsonBody(body)) {
      requestBody = JSON.stringify(body)
      headers.set(
        'Content-Type',
        headers.get('Content-Type') ?? 'application/json',
      )
    } else {
      requestBody = body
    }
  }

  let response: Response
  try {
    response = await fetch(buildApiUrl(path), {
      ...requestInit,
      body: requestBody,
      credentials: requestInit.credentials ?? 'include',
      headers,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError({
        kind: 'aborted',
        code: 'REQUEST_ABORTED',
        message: 'The request was cancelled.',
        cause: error,
      })
    }

    throw new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'The request could not reach the server.',
      cause: error,
    })
  }

  const responseBody = await readBody(response)
  if (!response.ok) {
    throw makeHttpError(response.status, responseBody, response.headers)
  }

  return responseBody as TResponse | undefined
}
