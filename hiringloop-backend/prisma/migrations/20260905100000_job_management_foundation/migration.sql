-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "department" VARCHAR(100),
    "employmentType" "EmploymentType",
    "workplaceType" "WorkplaceType",
    "location" VARCHAR(160),
    "description" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMPTZ(6),
    "closedAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- Database-level invariants for bounded openings and optimistic-concurrency versions.
ALTER TABLE "Job"
ADD CONSTRAINT "Job_openings_check"
CHECK ("openings" >= 1 AND "openings" <= 1000);

ALTER TABLE "Job"
ADD CONSTRAINT "Job_version_check"
CHECK ("version" >= 1);

-- Database-level lifecycle/timestamp consistency. Archived rows may originate from
-- either Draft or Closed, so openedAt/closedAt remain intentionally independent.
ALTER TABLE "Job"
ADD CONSTRAINT "Job_lifecycle_timestamps_check"
CHECK (
    ("status" = 'DRAFT' AND "openedAt" IS NULL AND "closedAt" IS NULL AND "archivedAt" IS NULL)
    OR ("status" = 'OPEN' AND "openedAt" IS NOT NULL AND "closedAt" IS NULL AND "archivedAt" IS NULL)
    OR ("status" = 'CLOSED' AND "openedAt" IS NOT NULL AND "closedAt" IS NOT NULL AND "archivedAt" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archivedAt" IS NOT NULL)
);

CREATE INDEX "Job_organizationId_updatedAt_idx" ON "Job"("organizationId", "updatedAt");
CREATE INDEX "Job_organizationId_status_updatedAt_idx" ON "Job"("organizationId", "status", "updatedAt");

ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
