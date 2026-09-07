import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'

const mocks = vi.hoisted(() => ({
  job: vi.fn(),
  form: vi.fn(),
  authorize: vi.fn(),
  submit: vi.fn(),
  put: vi.fn(),
}))

vi.mock('../../public-careers/hooks/queries', () => ({
  usePublicCareerJob: mocks.job,
}))
vi.mock('../hooks/queries', () => ({ usePublicApplicationForm: mocks.form }))
vi.mock('../hooks/mutations', () => ({
  useAuthorizePublicApplicationUpload: () => ({
    mutateAsync: mocks.authorize,
    isPending: false,
    reset: vi.fn(),
  }),
  useSubmitPublicApplication: () => ({
    mutateAsync: mocks.submit,
    isPending: false,
    reset: vi.fn(),
  }),
}))
vi.mock('../utils/direct-upload', () => ({ putResumeToSignedUrl: mocks.put }))

import { PublicApplyPage } from './PublicApplyPage'

const questions = [
  {
    id: 'q-short',
    type: 'SHORT_TEXT',
    label: 'Portfolio',
    description: 'A short answer',
    placeholder: 'https://example.test',
    required: true,
    options: [],
  },
  {
    id: 'q-long',
    type: 'LONG_TEXT',
    label: 'Experience',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'q-number',
    type: 'NUMBER',
    label: 'Years',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'q-yes',
    type: 'YES_NO',
    label: 'Authorized',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'q-single',
    type: 'SINGLE_SELECT',
    label: 'Level',
    description: null,
    placeholder: null,
    required: false,
    options: [{ id: 'option-junior', label: 'Junior', value: 'junior' }],
  },
  {
    id: 'q-multi',
    type: 'MULTI_SELECT',
    label: 'Skills',
    description: null,
    placeholder: null,
    required: false,
    options: [{ id: 'option-react', label: 'React', value: 'react' }],
  },
  {
    id: 'q-date',
    type: 'DATE',
    label: 'Available date',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'q-url',
    type: 'URL',
    label: 'Website',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
] as const

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/careers/acme/jobs/job-1/apply']}>
      <Routes>
        <Route
          path="/careers/:organizationSlug/jobs/:jobId/apply"
          element={<PublicApplyPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.job.mockReset()
  mocks.form.mockReset()
  mocks.authorize.mockReset()
  mocks.put.mockReset()
  mocks.submit.mockReset()
  mocks.job.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      organization: {
        name: 'Acme',
        slug: 'acme',
        website: null,
        description: null,
      },
      job: { id: 'job-1', title: 'Engineer' },
    },
  })
  mocks.form.mockReturnValue({
    isPending: false,
    isError: false,
    data: { versionId: 'version-1', questions },
  })
  mocks.authorize.mockResolvedValue({
    uploadId: 'upload-1',
    signedUploadUrl: 'https://signed.example',
    expiresAt: '2026-09-07T00:00:00.000Z',
    requiredHeaders: { 'Content-Type': 'application/pdf' },
  })
  mocks.put.mockResolvedValue(undefined)
  mocks.submit.mockResolvedValue({ submitted: true })
})
afterEach(() => cleanup())

describe('public apply page', () => {
  test('renders backend questions in order and exposes accessible controls', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Apply for Engineer' }),
    ).toBeVisible()
    expect(screen.getByLabelText(/First name/)).toBeVisible()
    expect(screen.getByLabelText(/Last name/)).toBeVisible()
    expect(screen.getByLabelText(/Portfolio/)).toBeVisible()
    expect(screen.getByLabelText('Experience')).toBeVisible()
    expect(screen.getByLabelText('Years')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Authorized' })).toBeVisible()
    expect(screen.getByLabelText('Level')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Skills' })).toBeVisible()
    expect(screen.getByLabelText('Available date')).toBeVisible()
    expect(screen.getByLabelText('Website')).toBeVisible()
    expect(screen.getByText('A short answer')).toBeVisible()
  })

  test('shows loading and unavailable states', () => {
    mocks.form.mockReturnValue({ isPending: true, isError: false })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Loading application' }),
    ).toBeVisible()
    cleanup()
    mocks.form.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        status: 404,
        code: 'APPLICATION_FORM_UNAVAILABLE',
        message: 'x',
      }),
      refetch: vi.fn(),
    })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Application unavailable' }),
    ).toBeVisible()
  })

  test('validates required fields and then submits with the exact form version and answer shapes', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(screen.getByText('This question is required.')).toBeVisible()
    expect(screen.getByLabelText(/First name/)).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('candidate-first-name-error'),
    )
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    await user.type(screen.getByLabelText(/First name/), 'Ada')
    await user.type(screen.getByLabelText(/Last name/), 'Lovelace')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.test')
    await user.type(
      screen.getByLabelText(/Portfolio/),
      'https://portfolio.test',
    )
    await user.selectOptions(screen.getByLabelText('Level'), 'option-junior')
    await user.click(screen.getByLabelText('React'))
    await user.click(screen.getByLabelText('No'))
    await user.upload(screen.getByLabelText(/Resume/), file)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
    expect(mocks.authorize).toHaveBeenCalledWith({
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: file.size,
    })
    expect(mocks.put).toHaveBeenCalledWith('https://signed.example', file, {
      'Content-Type': 'application/pdf',
    })
    expect(mocks.submit.mock.calls[0][0]).toMatchObject({
      formVersionId: 'version-1',
      resumeUploadId: 'upload-1',
      candidate: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
      },
    })
    expect(mocks.submit.mock.calls[0][0].answers).toEqual([
      { questionId: 'q-short', value: 'https://portfolio.test' },
      { questionId: 'q-yes', value: false },
      { questionId: 'q-single', value: { optionId: 'option-junior' } },
      { questionId: 'q-multi', value: { optionIds: ['option-react'] } },
    ])
    expect(mocks.submit.mock.calls[0][0].idempotencyKey).toMatch(
      /^[0-9a-f-]{36}$/i,
    )
    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeVisible()
  })

  test('reuses the idempotency key for a network retry while retaining form data', async () => {
    const user = userEvent.setup()
    mocks.submit
      .mockRejectedValueOnce(
        new ApiError({
          kind: 'network',
          code: 'NETWORK_ERROR',
          message: 'offline',
        }),
      )
      .mockResolvedValue({ submitted: true })
    renderPage()
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    await user.type(screen.getByLabelText(/First name/), 'Ada')
    await user.type(screen.getByLabelText(/Last name/), 'Lovelace')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.test')
    await user.type(
      screen.getByLabelText(/Portfolio/),
      'https://portfolio.test',
    )
    await user.upload(screen.getByLabelText(/Resume/), file)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await waitFor(() =>
      expect(screen.getByText(/could not reach/i)).toBeVisible(),
    )
    const firstKey = mocks.submit.mock.calls[0][0].idempotencyKey
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2))
    expect(mocks.submit.mock.calls[1][0].idempotencyKey).toBe(firstKey)
    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeVisible()
  })

  test('keeps entered data and offers retry when the resume upload fails', async () => {
    const user = userEvent.setup()
    mocks.put.mockRejectedValueOnce(
      new ApiError({
        kind: 'network',
        code: 'RESUME_UPLOAD_FAILED',
        message: 'offline',
      }),
    )
    renderPage()
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    await user.type(screen.getByLabelText(/First name/), 'Ada')
    await user.type(screen.getByLabelText(/Last name/), 'Lovelace')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.test')
    await user.type(
      screen.getByLabelText(/Portfolio/),
      'https://portfolio.test',
    )
    await user.upload(screen.getByLabelText(/Resume/), file)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    expect(
      await screen.findByText(/could not upload your resume/i),
    ).toBeVisible()
    expect(screen.getByDisplayValue('Ada')).toBeVisible()
    expect(screen.getByText('resume.pdf')).toBeVisible()
    mocks.put.mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
  })

  test('focuses the first invalid dynamic question and links its hint and error', async () => {
    const user = userEvent.setup()
    renderPage()
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    await user.type(screen.getByLabelText(/First name/), 'Ada')
    await user.type(screen.getByLabelText(/Last name/), 'Lovelace')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.test')
    await user.upload(screen.getByLabelText(/Resume/), file)
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    const portfolio = screen.getByLabelText(/Portfolio/)
    await waitFor(() => expect(portfolio).toHaveFocus())
    expect(portfolio).toHaveAttribute(
      'aria-describedby',
      'question-q-short-hint question-q-short-error',
    )
  })
})
