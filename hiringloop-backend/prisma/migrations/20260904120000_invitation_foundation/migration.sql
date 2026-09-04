-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "inviterMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Add the approved database-enforced intended membership role vocabulary.
ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_role_check"
CHECK ("role" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'));

-- A token hash is a bearer-secret lookup key and must never collide.
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- These indexes support the tenant-scoped email and management-list queries.
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");
CREATE INDEX "Invitation_organizationId_createdAt_idx" ON "Invitation"("organizationId", "createdAt");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterMembershipId_fkey"
FOREIGN KEY ("inviterMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
