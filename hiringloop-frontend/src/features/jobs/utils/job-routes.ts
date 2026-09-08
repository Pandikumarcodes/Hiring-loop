const organizationJobsPath = (organizationId: string) =>
  `/app/organizations/${encodeURIComponent(organizationId)}/jobs`

export const jobRoutes = {
  list: organizationJobsPath,
  create: (organizationId: string) =>
    `${organizationJobsPath(organizationId)}/new`,
  detail: (organizationId: string, jobId: string) =>
    `${organizationJobsPath(organizationId)}/${encodeURIComponent(jobId)}`,
  edit: (organizationId: string, jobId: string) =>
    `${organizationJobsPath(organizationId)}/${encodeURIComponent(jobId)}/edit`,
  pipeline: (organizationId: string, jobId: string) =>
    `${organizationJobsPath(organizationId)}/${encodeURIComponent(jobId)}/pipeline`,
  applicationForm: (organizationId: string, jobId: string) =>
    `${organizationJobsPath(organizationId)}/${encodeURIComponent(jobId)}/application-form`,
  scorecard: (organizationId: string, jobId: string) =>
    `${organizationJobsPath(organizationId)}/${encodeURIComponent(jobId)}/scorecard`,
}
