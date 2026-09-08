import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useCandidatesMock = vi.hoisted(() => vi.fn())
const useCandidateMock = vi.hoisted(() => vi.fn())
const useApplicationMock = vi.hoisted(() => vi.fn())
const useJobsMock = vi.hoisted(() => vi.fn())
const usePipelineMock = vi.hoisted(() => vi.fn())
const useDocumentAccessMock = vi.hoisted(() => vi.fn())

vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('../jobs/hooks/queries', () => ({ useJobs: useJobsMock }))
vi.mock('../pipelines/hooks/queries', () => ({ usePipeline: usePipelineMock }))
vi.mock('./hooks/queries', () => ({
  useCandidates: useCandidatesMock,
  useCandidate: useCandidateMock,
  useApplication: useApplicationMock,
}))
vi.mock('./hooks/mutations', () => ({
  useDocumentAccess: useDocumentAccessMock,
}))
vi.mock('../interviews', () => ({
  ApplicationInterviews: () => <section aria-label="Interviews" />,
}))

import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { CandidatesPage } from './pages/CandidatesPage'
import { CandidatesNavigationLink } from './components/CandidatesNavigationLink'

const permissions = [
  'candidate:list',
  'candidate:read',
  'candidate-document:access',
]
const candidate = {
  id: 'candidate-1',
  name: 'Alice Applicant',
  email: 'alice@example.test',
  applicationCount: 2,
  latestApplication: {
    id: 'application-1',
    job: { id: 'job-1', title: 'Senior Engineer' },
    currentStage: { id: 'stage-1', name: 'Phone screen' },
    submittedAt: '2026-09-01T10:00:00.000Z',
  },
}
const page = {
  candidates: [candidate],
  pagination: { page: 1, limit: 25, totalItems: 1, totalPages: 1 },
}
const application = {
  id: 'application-1',
  submittedAt: '2026-09-01T10:00:00.000Z',
  formVersionId: 'form-version-1',
  candidate: {
    id: 'candidate-1',
    name: 'Alice Applicant',
    email: 'alice@example.test',
    phone: '+91 90000 00000',
  },
  job: { id: 'job-1', title: 'Senior Engineer' },
  currentStage: { id: 'stage-1', name: 'Phone screen' },
  answers: [
    {
      question: {
        id: 'question-1',
        type: 'SHORT_TEXT',
        label: 'Why this role?',
        description: null,
        required: true,
        sortOrder: 1,
      },
      value: 'I enjoy building useful products.',
      selectedOptions: [],
    },
    {
      question: {
        id: 'question-2',
        type: 'SINGLE_SELECT',
        label: 'Work authorization',
        description: null,
        required: true,
        sortOrder: 2,
      },
      value: { optionId: 'option-1' },
      selectedOptions: [{ id: 'option-1', label: 'Authorized' }],
    },
    {
      question: {
        id: 'question-3',
        type: 'URL',
        label: 'Portfolio',
        description: null,
        required: false,
        sortOrder: 3,
      },
      value: 'https://portfolio.example.test/alice',
      selectedOptions: [],
    },
  ],
  documents: [
    {
      id: 'document-1',
      fileName: 'alice-resume.pdf',
      contentType: 'application/pdf',
      type: 'RESUME',
      createdAt: '2026-09-01T10:01:00.000Z',
    },
  ],
  stageHistory: [
    {
      id: 'history-1',
      event: 'APPLICATION_SUBMITTED',
      occurredAt: '2026-09-01T10:00:00.000Z',
      fromStage: null,
      toStage: { id: 'stage-1', name: 'Phone screen' },
    },
  ],
}

function readyOrganization(perms = permissions) {
  return { data: { permissions: perms }, isPending: false, isError: false }
}

beforeEach(() => {
  useOrganizationMock.mockReturnValue(readyOrganization())
  useCandidatesMock.mockReturnValue({
    data: page,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  useCandidateMock.mockReturnValue({
    data: {
      id: 'candidate-1',
      name: 'Alice Applicant',
      email: 'alice@example.test',
      phone: '+91 90000 00000',
      createdAt: '2026-09-01T10:00:00.000Z',
      applications: [candidate.latestApplication],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  useApplicationMock.mockReturnValue({
    data: application,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  useJobsMock.mockReturnValue({
    data: { jobs: [{ id: 'job-1', title: 'Senior Engineer' }] },
    isPending: false,
    isError: false,
  })
  usePipelineMock.mockReturnValue({
    data: { stages: [{ id: 'stage-1', name: 'Phone screen' }] },
    isPending: false,
    isError: false,
  })
  useDocumentAccessMock.mockReturnValue({
    mutateAsync: vi
      .fn()
      .mockResolvedValue({ url: 'https://signed.example.test/resume' }),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderAt(element: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/organizations/:organizationId/*" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('candidate list', () => {
  test('shows navigation only with candidate list permission', () => {
    const { rerender } = render(
      <MemoryRouter>
        <CandidatesNavigationLink permissions={[]} />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('link', { name: 'Candidates' }),
    ).not.toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <CandidatesNavigationLink permissions={['candidate:list']} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Candidates' })).toBeVisible()
  })

  test('renders summaries and candidate detail navigation', () => {
    renderAt(<CandidatesPage />, '/app/organizations/org-1/candidates')
    expect(screen.getByRole('heading', { name: 'Candidates' })).toBeVisible()
    expect(screen.getAllByText('Alice Applicant')).not.toHaveLength(0)
    expect(screen.getAllByText('Senior Engineer')).not.toHaveLength(0)
    expect(
      screen.getAllByRole('link', { name: 'Alice Applicant' })[0],
    ).toHaveAttribute('href', '/app/organizations/org-1/candidates/candidate-1')
  })

  test('sends backend search, filter, sort, and pagination values', async () => {
    const user = userEvent.setup()
    useCandidatesMock.mockReturnValue({
      data: { ...page, pagination: { ...page.pagination, totalPages: 2 } },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    renderAt(<CandidatesPage />, '/app/organizations/org-1/candidates')
    await user.type(
      screen.getByRole('textbox', { name: /search candidates/i }),
      'Alice',
    )
    await waitFor(() =>
      expect(useCandidatesMock).toHaveBeenLastCalledWith(
        'org-1',
        expect.objectContaining({ search: 'Alice' }),
        true,
      ),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Job' }),
      'job-1',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pipeline stage' }),
      'stage-1',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort' }),
      'nameAsc',
    )
    expect(useCandidatesMock).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({
        jobId: 'job-1',
        stageId: 'stage-1',
        sort: 'nameAsc',
        page: 1,
      }),
      true,
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(useCandidatesMock).toHaveBeenLastCalledWith(
        'org-1',
        expect.objectContaining({ page: 2 }),
        true,
      ),
    )
  })

  test('shows empty and denied states', () => {
    useCandidatesMock.mockReturnValue({
      data: { candidates: [], pagination: page.pagination },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    renderAt(<CandidatesPage />, '/app/organizations/org-1/candidates')
    expect(
      screen.getByRole('heading', { name: 'No candidates yet' }),
    ).toBeVisible()
    cleanup()
    useOrganizationMock.mockReturnValue(readyOrganization([]))
    renderAt(<CandidatesPage />, '/app/organizations/org-1/candidates')
    expect(
      screen.getByRole('heading', { name: 'Candidate access unavailable' }),
    ).toBeVisible()
  })
})

describe('candidate and application details', () => {
  test('renders candidate profile and application navigation', () => {
    renderAt(
      <CandidateDetailPage />,
      '/app/organizations/org-1/candidates/candidate-1',
    )
    expect(
      screen.getByRole('heading', { name: 'Alice Applicant' }),
    ).toBeVisible()
    expect(screen.getByText('Senior Engineer')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'View application' }),
    ).toHaveAttribute(
      'href',
      '/app/organizations/org-1/applications/application-1',
    )
  })

  test('renders answers, stage history, document metadata, and handles secure access', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderAt(
      <ApplicationDetailPage />,
      '/app/organizations/org-1/applications/application-1',
    )
    expect(
      screen.getByRole('heading', { name: 'Senior Engineer' }),
    ).toBeVisible()
    expect(screen.getByText('Phone screen')).toBeVisible()
    expect(screen.getByText('I enjoy building useful products.')).toBeVisible()
    expect(screen.getByText('Authorized')).toBeVisible()
    expect(
      screen.getByRole('link', {
        name: 'https://portfolio.example.test/alice',
      }),
    ).toBeVisible()
    expect(screen.getByText('alice-resume.pdf')).toBeVisible()
    expect(screen.getAllByText(/application submitted/i)).not.toHaveLength(0)
    await user.click(
      screen.getByRole('button', { name: 'View / download resume' }),
    )
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        'https://signed.example.test/resume',
        '_blank',
        'noopener,noreferrer',
      ),
    )
    expect(
      useDocumentAccessMock.mock.results[0]?.value.mutateAsync,
    ).toHaveBeenCalledWith('document-1')
  })
})
