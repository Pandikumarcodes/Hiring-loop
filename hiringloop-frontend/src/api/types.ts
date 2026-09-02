export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export interface JsonObject {
  readonly [key: string]: JsonValue
}

export interface BackendErrorEnvelope {
  readonly error: {
    readonly code?: unknown
    readonly message?: unknown
    readonly details?: unknown
    readonly requestId?: unknown
  }
}
