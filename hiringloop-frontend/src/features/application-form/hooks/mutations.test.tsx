import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { applicationFormKeys } from './query-keys'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn() }))
vi.mock('../../auth/hooks/authenticated-mutation', () => ({
  runAuthenticatedAuthMutation: mocks.auth,
}))
vi.mock('../api/application-form.api', () => ({
  createDraft: mocks.create,
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  reorderQuestions: vi.fn(),
  publishDraft: vi.fn(),
  discardDraft: vi.fn(),
}))
import { useCreateDraft } from './mutations'
describe('Application form mutation cache behavior', () => {
  let client: QueryClient
  const key = applicationFormKeys.builder('org', 'job')
  function wrap({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.auth.mockImplementation(
      (_c: QueryClient, a: (csrf: string) => Promise<unknown>) => a('csrf'),
    )
    mocks.create.mockReset()
  })
  test('replaces exactly the builder cache on success', async () => {
    const data = { id: 'f' }
    mocks.create.mockResolvedValue(data)
    const { result } = renderHook(() => useCreateDraft('org', 'job'), {
      wrapper: wrap,
    })
    result.current.mutate(undefined)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(key)).toBe(data)
  })
  test('invalidates exactly the builder query on conflict', async () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    mocks.create.mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'FORM_VERSION_CONFLICT',
        message: 'stale',
      }),
    )
    const { result } = renderHook(() => useCreateDraft('org', 'job'), {
      wrapper: wrap,
    })
    result.current.mutate(undefined)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true })
  })
})
