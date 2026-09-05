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
          <Route path="organizations" element={<OrganizationLandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
