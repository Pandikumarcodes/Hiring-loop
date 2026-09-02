export type ApiErrorKind =
  | 'http'
  | 'network'
  | 'aborted'
  | 'configuration'
  | 'response'

export interface ApiErrorOptions {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code: string
  readonly message: string
  readonly details?: unknown
  readonly requestId?: string
  readonly cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly code: string
  readonly details: unknown
  readonly requestId: string | undefined

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = options.kind
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
