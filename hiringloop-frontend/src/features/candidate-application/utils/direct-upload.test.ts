import { beforeEach, describe, expect, test, vi } from 'vitest'
import { putResumeToSignedUrl } from './direct-upload'

beforeEach(() => vi.restoreAllMocks())

describe('direct resume upload', () => {
  test('puts the exact file with signed headers and no application credentials', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    await putResumeToSignedUrl('https://signed.example', file, {
      'Content-Type': 'application/pdf',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://signed.example', {
      method: 'PUT',
      body: file,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/pdf' },
    })
  })
})
