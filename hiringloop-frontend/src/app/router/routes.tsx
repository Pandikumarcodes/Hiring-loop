import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '../../layouts/AppLayout'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { FoundationPage } from '../pages/FoundationPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '../../features/auth/pages'
import { OrganizationLandingPage } from '../../features/organizations/pages/OrganizationLandingPage'
import { useOrganizations } from '../../features/organizations/hooks/queries'
import { lazyRoute } from './LazyRoute'

const OrganizationOnboardingPage = lazyRoute(async () => {
  const module = await import(
    '../../features/organizations/pages/OrganizationOnboardingPage'
  )
  return { default: module.OrganizationOnboardingPage }
})

const OrganizationWorkspacePage = lazyRoute(async () => {
  const module = await import(
    '../../features/organizations/pages/OrganizationWorkspacePage'
  )
  return { default: module.OrganizationWorkspacePage }
})

const InvitationAcceptancePage = lazyRoute(async () => {
  const module = await import(
    '../../features/team/pages/InvitationAcceptancePage'
  )
  return { default: module.InvitationAcceptancePage }
})

const TeamPage = lazyRoute(async () => {
  const module = await import('../../features/team/pages/TeamPage')
  return { default: module.TeamPage }
})

const CreateJobPage = lazyRoute(async () => {
  const module = await import('../../features/jobs/pages/CreateJobPage')
  return { default: module.CreateJobPage }
})

const EditJobPage = lazyRoute(async () => {
  const module = await import('../../features/jobs/pages/EditJobPage')
  return { default: module.EditJobPage }
})

const JobDetailPage = lazyRoute(async () => {
  const module = await import('../../features/jobs/pages/JobDetailPage')
  return { default: module.JobDetailPage }
})

const JobsPage = lazyRoute(async () => {
  const module = await import('../../features/jobs/pages/JobsPage')
  return { default: module.JobsPage }
})

const PipelineConfigurationPage = lazyRoute(async () => {
  const module = await import(
    '../../features/pipelines/pages/PipelineConfigurationPage'
  )
  return { default: module.PipelineConfigurationPage }
})

const ApplicationFormBuilderPage = lazyRoute(async () => {
  const module = await import(
    '../../features/application-form/pages/ApplicationFormBuilderPage'
  )
  return { default: module.ApplicationFormBuilderPage }
})

const PublicCareerPage = lazyRoute(async () => {
  const module = await import(
    '../../features/public-careers/pages/PublicCareerPage'
  )
  return { default: module.PublicCareerPage }
})

const PublicJobDetailPage = lazyRoute(async () => {
  const module = await import(
    '../../features/public-careers/pages/PublicJobDetailPage'
  )
  return { default: module.PublicJobDetailPage }
})

const PublicApplyPage = lazyRoute(async () => {
  const module = await import(
    '../../features/candidate-application/pages/PublicApplyPage'
  )
  return { default: module.PublicApplyPage }
})

const ApplicationDetailPage = lazyRoute(async () => {
  const module = await import(
    '../../features/candidate-management/pages/ApplicationDetailPage'
  )
  return { default: module.ApplicationDetailPage }
})

const CandidateDetailPage = lazyRoute(async () => {
  const module = await import(
    '../../features/candidate-management/pages/CandidateDetailPage'
  )
  return { default: module.CandidateDetailPage }
})

const CandidatesPage = lazyRoute(async () => {
  const module = await import(
    '../../features/candidate-management/pages/CandidatesPage'
  )
  return { default: module.CandidatesPage }
})

const InterviewDetailPage = lazyRoute(async () => {
  const module = await import(
    '../../features/interviews/pages/InterviewDetailPage'
  )
  return { default: module.InterviewDetailPage }
})

const InterviewsPage = lazyRoute(async () => {
  const module = await import('../../features/interviews/pages/InterviewsPage')
  return { default: module.InterviewsPage }
})

const NotificationsPage = lazyRoute(async () => {
  const module = await import(
    '../../features/notifications/pages/NotificationsPage'
  )
  return { default: module.NotificationsPage }
})

const TalentPoolDetailPage = lazyRoute(async () => {
  const module = await import(
    '../../features/talent-pools/pages/TalentPoolDetailPage'
  )
  return { default: module.TalentPoolDetailPage }
})

const TalentPoolsPage = lazyRoute(async () => {
  const module = await import(
    '../../features/talent-pools/pages/TalentPoolsPage'
  )
  return { default: module.TalentPoolsPage }
})

const MyScorecardPage = lazyRoute(async () => {
  const module = await import('../../features/scorecards/pages/MyScorecardPage')
  return { default: module.MyScorecardPage }
})

const ScorecardTemplatePage = lazyRoute(async () => {
  const module = await import(
    '../../features/scorecards/pages/ScorecardTemplatePage'
  )
  return { default: module.ScorecardTemplatePage }
})

const AnalyticsPage = lazyRoute(async () => {
  const module = await import('../../features/analytics/pages/AnalyticsPage')
  return { default: module.AnalyticsPage }
})

const AuditPage = lazyRoute(async () => {
  const module = await import('../../features/audit/pages/AuditPage')
  return { default: module.AuditPage }
})

function OrganizationOnboardingRoute() {
  const organizations = useOrganizations()
  return (
    <OrganizationOnboardingPage
      organizationCount={organizations.data?.length ?? 0}
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="invitations/accept" element={<InvitationAcceptancePage />} />
      <Route element={<PublicLayout />}>
        <Route index element={<FoundationPage />} />
        <Route
          path="careers/:organizationSlug"
          element={<PublicCareerPage />}
        />
        <Route
          path="careers/:organizationSlug/jobs/:jobId"
          element={<PublicJobDetailPage />}
        />
        <Route
          path="careers/:organizationSlug/jobs/:jobId/apply"
          element={<PublicApplyPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="app/*" element={<AppLayout />}>
          <Route index element={<OrganizationLandingPage />} />
          <Route
            path="organizations/new"
            element={<OrganizationOnboardingRoute />}
          />
          <Route
            path="organizations/:organizationId"
            element={<OrganizationWorkspacePage />}
          />
          <Route
            path="organizations/:organizationId/team"
            element={<TeamPage />}
          />
          <Route
            path="organizations/:organizationId/jobs"
            element={<JobsPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/new"
            element={<CreateJobPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/:jobId"
            element={<JobDetailPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/:jobId/edit"
            element={<EditJobPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/:jobId/pipeline"
            element={<PipelineConfigurationPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/:jobId/application-form"
            element={<ApplicationFormBuilderPage />}
          />
          <Route
            path="organizations/:organizationId/jobs/:jobId/scorecard"
            element={<ScorecardTemplatePage />}
          />
          <Route
            path="organizations/:organizationId/candidates"
            element={<CandidatesPage />}
          />
          <Route
            path="organizations/:organizationId/candidates/:candidateId"
            element={<CandidateDetailPage />}
          />
          <Route
            path="organizations/:organizationId/applications/:applicationId"
            element={<ApplicationDetailPage />}
          />
          <Route
            path="organizations/:organizationId/interviews"
            element={<InterviewsPage />}
          />
          <Route
            path="organizations/:organizationId/interviews/:interviewId"
            element={<InterviewDetailPage />}
          />
          <Route
            path="organizations/:organizationId/interviews/:interviewId/scorecard"
            element={<MyScorecardPage />}
          />
          <Route
            path="organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
          <Route
            path="organizations/:organizationId/talent-pools"
            element={<TalentPoolsPage />}
          />
          <Route
            path="organizations/:organizationId/talent-pools/:talentPoolId"
            element={<TalentPoolDetailPage />}
          />
          <Route
            path="organizations/:organizationId/analytics"
            element={<AnalyticsPage />}
          />
          <Route
            path="organizations/:organizationId/audit"
            element={<AuditPage />}
          />
          <Route path="organizations" element={<OrganizationLandingPage />} />
          <Route path="*" element={<NotFoundPage context="application" />} />
        </Route>
      </Route>
    </Routes>
  )
}
