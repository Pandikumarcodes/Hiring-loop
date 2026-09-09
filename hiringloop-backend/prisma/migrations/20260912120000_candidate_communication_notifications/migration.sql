CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL');
CREATE TYPE "CommunicationDirection" AS ENUM ('OUTBOUND');
CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "NotificationType" AS ENUM ('CANDIDATE_COMMUNICATION_FAILED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_RESCHEDULED', 'INTERVIEW_CANCELLED', 'SCORECARD_SUBMITTED');

CREATE TABLE "Communication" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "applicationId" UUID NOT NULL, "createdByUserId" UUID NOT NULL,
 "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL', "direction" "CommunicationDirection" NOT NULL DEFAULT 'OUTBOUND',
 "recipientEmail" VARCHAR(320) NOT NULL, "subject" VARCHAR(998) NOT NULL, "body" TEXT NOT NULL,
 "status" "CommunicationStatus" NOT NULL DEFAULT 'PENDING', "provider" VARCHAR(32) NOT NULL, "providerMessageId" VARCHAR(255), "failureCategory" VARCHAR(64),
 "idempotencyKey" UUID NOT NULL, "payloadHash" VARCHAR(64) NOT NULL, "sentAt" TIMESTAMPTZ(6), "failedAt" TIMESTAMPTZ(6),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "Communication_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Communication_state_check" CHECK (("status"='PENDING' AND "sentAt" IS NULL AND "failedAt" IS NULL) OR ("status"='SENT' AND "sentAt" IS NOT NULL AND "failedAt" IS NULL) OR ("status"='FAILED' AND "failedAt" IS NOT NULL AND "sentAt" IS NULL)),
 CONSTRAINT "Communication_content_check" CHECK (char_length(btrim("recipientEmail")) BETWEEN 3 AND 320 AND char_length(btrim("subject")) BETWEEN 1 AND 998 AND char_length(btrim("body")) BETWEEN 1 AND 100000)
);
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Communication_applicationId_organizationId_fkey" FOREIGN KEY ("applicationId","organizationId") REFERENCES "Application"("id","organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Communication_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE UNIQUE INDEX "Communication_idempotency_key" ON "Communication" ("organizationId","applicationId","createdByUserId","idempotencyKey");
CREATE INDEX "Communication_history_idx" ON "Communication" ("organizationId","applicationId","createdAt" DESC,"id" DESC);

CREATE TABLE "CommunicationTemplate" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "name" VARCHAR(160) NOT NULL, "subject" VARCHAR(998) NOT NULL, "body" TEXT NOT NULL, "createdByUserId" UUID NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY("id"), CONSTRAINT "CommunicationTemplate_content_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 160 AND char_length(btrim("subject")) BETWEEN 1 AND 998 AND char_length(btrim("body")) BETWEEN 1 AND 100000), CONSTRAINT "CommunicationTemplate_revision_check" CHECK ("revision" > 0)
);
ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "CommunicationTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE UNIQUE INDEX "CommunicationTemplate_organizationId_name_key" ON "CommunicationTemplate" ("organizationId","name");
CREATE INDEX "CommunicationTemplate_organizationId_name_idx" ON "CommunicationTemplate" ("organizationId","name");

CREATE TABLE "Notification" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "recipientUserId" UUID NOT NULL, "type" "NotificationType" NOT NULL, "title" VARCHAR(160) NOT NULL, "message" VARCHAR(1000) NOT NULL, "applicationId" UUID, "interviewId" UUID, "readAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Notification_pkey" PRIMARY KEY("id"), CONSTRAINT "Notification_target_check" CHECK (("applicationId" IS NOT NULL AND "interviewId" IS NULL) OR ("applicationId" IS NULL AND "interviewId" IS NOT NULL))
);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "Notification_applicationId_organizationId_fkey" FOREIGN KEY ("applicationId","organizationId") REFERENCES "Application"("id","organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "Notification_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX "Notification_inbox_idx" ON "Notification" ("organizationId","recipientUserId","createdAt" DESC,"id" DESC);
CREATE INDEX "Notification_unread_idx" ON "Notification" ("organizationId","recipientUserId") WHERE "readAt" IS NULL;

CREATE TABLE "NotificationPreference" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "userId" UUID NOT NULL, "notificationType" "NotificationType" NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY("id")
);
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT "NotificationPreference_membership_fkey" FOREIGN KEY ("organizationId","userId") REFERENCES "OrganizationMembership"("organizationId","userId") ON DELETE CASCADE ON UPDATE RESTRICT;
CREATE UNIQUE INDEX "NotificationPreference_organizationId_userId_notificationType_key" ON "NotificationPreference" ("organizationId","userId","notificationType");
