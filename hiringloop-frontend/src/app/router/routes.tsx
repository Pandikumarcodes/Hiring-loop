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
import {
  OrganizationLandingPage,
  OrganizationOnboardingPage,
  OrganizationWorkspacePage,
} from '../../features/organizations'
import { useOrganizations } from '../../features/organizations/hooks/queries'
import { InvitationAcceptancePage, TeamPage } from '../../features/team'
import {
  CreateJobPage,
  EditJobPage,
  JobDetailPage,
  JobsPage,
} from '../../features/jobs'
import { PipelineConfigurationPage } from '../../features/pipelines'
import { ApplicationFormBuilderPage } from '../../features/application-form'
import {
  PublicCareerPage,
  PublicJobDetailPage,
} from '../../features/public-careers/pages'
import { PublicApplyPage } from '../../features/candidate-application'
import {
  ApplicationDetailPage,
  CandidateDetailPage,
  CandidatesPage,
} from '../../features/candidate-management'
import { InterviewDetailPage, InterviewsPage } from '../../features/interviews'
import { NotificationsPage } from '../../features/notifications'
import {
  MyScorecardPage,
  ScorecardTemplatePage,
} from '../../features/scorecards'

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
          <Route path="organizations" element={<OrganizationLandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
