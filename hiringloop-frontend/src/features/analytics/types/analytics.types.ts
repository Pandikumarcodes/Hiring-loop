export interface AnalyticsFilters {
  readonly from: string
  readonly to: string
  readonly jobId?: string
}

export interface AnalyticsOverview {
  readonly applicationsReceived: number
  readonly scheduledInterviews: number
  readonly offersSent: number
  readonly hires: number
  readonly rejections: number
  readonly activeApplications: number
  readonly openJobs: number
  readonly awaitingOfferDecision: number
  readonly averageTimeToHireSeconds: number | null
  readonly generatedAt: string
}

export interface AnalyticsFunnel {
  readonly applied: number
  readonly offerSent: number
  readonly offerAccepted: number
  readonly hired: number
  readonly scheduledInterviewContext: number
}

export interface AnalyticsPipeline {
  readonly currentStages: readonly {
    readonly id: string
    readonly name: string
    readonly count: number
  }[]
  readonly initialEntries: readonly {
    readonly stageId: string
    readonly count: number
  }[]
}

export interface AnalyticsInterviews {
  readonly scheduled: number
  readonly cancelled: number
  readonly upcoming: number
  readonly submittedFeedback: number
}

export interface AnalyticsCommunications {
  readonly attempted: number
  readonly pending: number
  readonly sent: number
  readonly failed: number
  readonly completedDeliverySuccessRate: number | null
}

export interface AnalyticsOutcomes {
  readonly hired: number
  readonly rejected: number
  readonly reopened: number
  readonly hireRate: number | null
  readonly rejectionRate: number | null
  readonly rejectionReasons: readonly {
    readonly code: string | null
    readonly count: number
  }[]
  readonly averageTimeToHireSeconds: number | null
  readonly offers: {
    readonly created: number | null
    readonly sent: number | null
    readonly accepted: number
    readonly declined: number
    readonly withdrawn: number
    readonly awaitingDecision: number
    readonly acceptanceRate: number | null
    readonly declineRate: number | null
  }
  readonly talentPools: {
    readonly poolCount: number
    readonly memberships: number
    readonly uniqueCandidates: number
    readonly membersAddedInRange: number
  }
}

export interface AnalyticsJobRow {
  readonly id: string
  readonly title: string
  readonly applications: number
  readonly active: number
  readonly scheduledInterviews: number
  readonly offersSent: number
  readonly hires: number
  readonly rejections: number
}

export interface AnalyticsJobsPage {
  readonly rows: readonly AnalyticsJobRow[]
  readonly totalItems: number
}
