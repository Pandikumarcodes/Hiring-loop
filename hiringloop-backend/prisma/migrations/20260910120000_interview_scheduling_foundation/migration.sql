-- Phase 14 interview scheduling. Interviews remain tenant-owned historical
-- records and therefore use restrictive referential actions.
CREATE TYPE "InterviewFormat" AS ENUM ('VIDEO', 'PHONE', 'ONSITE');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

CREATE TABLE "Interview" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "format" "InterviewFormat" NOT NULL,
  "scheduledStartAt" TIMESTAMPTZ(6) NOT NULL,
  "scheduledEndAt" TIMESTAMPTZ(6) NOT NULL,
  "timeZone" VARCHAR(64) NOT NULL,
  "meetingUrl" VARCHAR(2048),
  "location" VARCHAR(240),
  "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "cancelledAt" TIMESTAMPTZ(6),
  "cancelledByUserId" UUID,
  "cancellationReason" VARCHAR(500),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Interview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Interview_title_length_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 160),
  CONSTRAINT "Interview_timeZone_length_check" CHECK (char_length(btrim("timeZone")) BETWEEN 1 AND 64),
  CONSTRAINT "Interview_time_range_check" CHECK ("scheduledEndAt" > "scheduledStartAt"),
  CONSTRAINT "Interview_cancellation_state_check" CHECK (
    ("status" = 'SCHEDULED' AND "cancelledAt" IS NULL AND "cancelledByUserId" IS NULL AND "cancellationReason" IS NULL)
    OR ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledByUserId" IS NOT NULL)
  )
);

CREATE TABLE "InterviewParticipant" (
  "id" UUID NOT NULL,
  "interviewId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InterviewParticipant_interviewId_userId_key" UNIQUE ("interviewId", "userId")
);

ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Interview_applicationId_organizationId_fkey"
    FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Interview_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Interview_cancelledByUserId_fkey"
    FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "InterviewParticipant"
  ADD CONSTRAINT "InterviewParticipant_interviewId_fkey"
    FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "InterviewParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Calendar/list queries always scope by organization and bounded start time.
CREATE INDEX "Interview_organizationId_scheduledStartAt_idx"
  ON "Interview" ("organizationId", "scheduledStartAt");

-- Application detail orders the application's interview history by start time.
CREATE INDEX "Interview_applicationId_scheduledStartAt_idx"
  ON "Interview" ("applicationId", "scheduledStartAt");

-- The assigned-interviewer calendar path begins with participant userId.
CREATE INDEX "InterviewParticipant_userId_interviewId_idx"
  ON "InterviewParticipant" ("userId", "interviewId");
