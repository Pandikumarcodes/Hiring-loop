import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

vi.mock('./ProtectedRoute', () => ({ ProtectedRoute: () => <Outlet /> }))
vi.mock('../../layouts/AppLayout', () => ({ AppLayout: () => <Outlet /> }))
vi.mock('../../features/auth/hooks/queries', () => ({
  useCurrentUser: () => ({ isUnauthenticated: true }),
}))
vi.mock('../../features/jobs/pages/JobsPage', () => ({
  JobsPage: () => <h1>Jobs route</h1>,
}))
vi.mock('../../features/jobs/pages/CreateJobPage', () => ({
  CreateJobPage: () => <h1>Create route</h1>,
}))
vi.mock('../../features/jobs/pages/JobDetailPage', () => ({
  JobDetailPage: () => <h1>Detail route</h1>,
}))
vi.mock('../../features/jobs/pages/EditJobPage', () => ({
  EditJobPage: () => <h1>Edit route</h1>,
}))
vi.mock('../../features/pipelines/pages/PipelineConfigurationPage', () => ({
  PipelineConfigurationPage: () => <h1>Pipeline route</h1>,
}))
vi.mock(
  '../../features/application-form/pages/ApplicationFormBuilderPage',
  () => ({
    ApplicationFormBuilderPage: () => <h1>Application form route</h1>,
  }),
)
vi.mock('../../features/candidate-application/pages/PublicApplyPage', () => ({
  PublicApplyPage: () => <h1>Apply route</h1>,
}))
vi.mock('../../features/candidate-management/pages/CandidatesPage', () => ({
  CandidatesPage: () => <h1>Candidates route</h1>,
}))
vi.mock(
  '../../features/candidate-management/pages/CandidateDetailPage',
  () => ({
    CandidateDetailPage: () => <h1>Candidate detail route</h1>,
  }),
)
vi.mock(
  '../../features/candidate-management/pages/ApplicationDetailPage',
  () => ({
    ApplicationDetailPage: () => <h1>Application detail route</h1>,
  }),
)
vi.mock('../../features/organizations/pages/OrganizationWorkspacePage', () => ({
  OrganizationWorkspacePage: () => <h1>Dashboard route</h1>,
}))
vi.mock(
  '../../features/organizations/pages/OrganizationOnboardingPage',
  () => ({
    OrganizationOnboardingPage: () => <h1>Onboarding route</h1>,
  }),
)
vi.mock('../../features/team/pages/TeamPage', () => ({
  TeamPage: () => <h1>Team route</h1>,
}))
vi.mock('../../features/team/pages/InvitationAcceptancePage', () => ({
  InvitationAcceptancePage: () => <h1>Invitation route</h1>,
}))
vi.mock('../../features/interviews/pages/InterviewsPage', () => ({
  InterviewsPage: () => <h1>Interviews route</h1>,
}))
vi.mock('../../features/interviews/pages/InterviewDetailPage', () => ({
  InterviewDetailPage: () => <h1>Interview detail route</h1>,
}))
vi.mock('../../features/scorecards/pages/MyScorecardPage', () => ({
  MyScorecardPage: () => <h1>Scorecard route</h1>,
}))
vi.mock('../../features/scorecards/pages/ScorecardTemplatePage', () => ({
  ScorecardTemplatePage: () => <h1>Scorecard template route</h1>,
}))
vi.mock('../../features/talent-pools/pages/TalentPoolsPage', () => ({
  TalentPoolsPage: () => <h1>Pools route</h1>,
}))
vi.mock('../../features/talent-pools/pages/TalentPoolDetailPage', () => ({
  TalentPoolDetailPage: () => <h1>Pool detail route</h1>,
}))
vi.mock('../../features/analytics/pages/AnalyticsPage', () => ({
  AnalyticsPage: () => <h1>Analytics route</h1>,
}))
vi.mock('../../features/audit/pages/AuditPage', () => ({
  AuditPage: () => <h1>Audit route</h1>,
}))
vi.mock('../../features/notifications/pages/NotificationsPage', () => ({
  NotificationsPage: () => <h1>Notifications route</h1>,
}))
vi.mock('../../features/public-careers/pages/PublicCareerPage', () => ({
  PublicCareerPage: () => <h1>Careers route</h1>,
}))
vi.mock('../../features/public-careers/pages/PublicJobDetailPage', () => ({
  PublicJobDetailPage: () => <h1>Public job route</h1>,
}))
vi.mock('../../features/organizations/hooks/queries', () => ({
  useOrganizations: () => ({ data: [] }),
}))

import { AppRoutes } from './routes'

afterEach(cleanup)

describe('Job route matching', () => {
  test.each([
    ['/app/organizations/org-1', 'Dashboard route'],
    ['/app/organizations/new', 'Onboarding route'],
    ['/app/organizations/org-1/jobs', 'Jobs route'],
    ['/app/organizations/org-1/team', 'Team route'],
    ['/app/organizations/org-1/interviews', 'Interviews route'],
    ['/app/organizations/org-1/interviews/i-1', 'Interview detail route'],
    ['/app/organizations/org-1/interviews/i-1/scorecard', 'Scorecard route'],
    [
      '/app/organizations/org-1/jobs/job-1/scorecard',
      'Scorecard template route',
    ],
    ['/app/organizations/org-1/talent-pools', 'Pools route'],
    ['/app/organizations/org-1/talent-pools/p-1', 'Pool detail route'],
    ['/app/organizations/org-1/analytics', 'Analytics route'],
    ['/app/organizations/org-1/audit', 'Audit route'],
    ['/app/organizations/org-1/notifications', 'Notifications route'],
    ['/careers/acme', 'Careers route'],
    ['/careers/acme/jobs/job-1', 'Public job route'],
    ['/invitations/accept', 'Invitation route'],
    ['/app/organizations/org-1/jobs/new', 'Create route'],
    ['/app/organizations/org-1/jobs/job-1', 'Detail route'],
    ['/app/organizations/org-1/jobs/job-1/edit', 'Edit route'],
    ['/app/organizations/org-1/jobs/job-1/pipeline', 'Pipeline route'],
    [
      '/app/organizations/org-1/jobs/job-1/application-form',
      'Application form route',
    ],
    ['/app/organizations/org-1/candidates', 'Candidates route'],
    [
      '/app/organizations/org-1/candidates/candidate-1',
      'Candidate detail route',
    ],
    [
      '/app/organizations/org-1/applications/application-1',
      'Application detail route',
    ],
    ['/careers/acme/jobs/job-1/apply', 'Apply route'],
  ])('%s renders %s', async (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { name: heading }, { timeout: 5000 }),
    ).toBeVisible()
  })
})
