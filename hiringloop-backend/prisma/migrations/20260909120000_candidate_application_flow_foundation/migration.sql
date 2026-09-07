-- Phase 12 candidate application persistence. Historical application records
-- use restrictive FKs; recruiter-side lifecycle/deletion policy remains later.
CREATE TYPE "CandidateDocumentType" AS ENUM ('RESUME');
CREATE TYPE "ApplicationUploadStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED');

CREATE TABLE "Candidate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "normalizedEmail" VARCHAR(320) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(50),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Candidate_organizationId_normalizedEmail_key" UNIQUE ("organizationId", "normalizedEmail"),
  CONSTRAINT "Candidate_id_organizationId_key" UNIQUE ("id", "organizationId"),
  CONSTRAINT "Candidate_firstName_length_check" CHECK (char_length(btrim("firstName")) BETWEEN 1 AND 100),
  CONSTRAINT "Candidate_lastName_length_check" CHECK (char_length(btrim("lastName")) BETWEEN 1 AND 100)
);

CREATE TABLE "Application" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "candidateId" UUID NOT NULL,
  "applicationFormVersionId" UUID NOT NULL,
  "currentPipelineStageId" UUID NOT NULL,
  "submittedFirstName" VARCHAR(100) NOT NULL,
  "submittedLastName" VARCHAR(100) NOT NULL,
  "submittedEmail" VARCHAR(320) NOT NULL,
  "submittedPhone" VARCHAR(50),
  "idempotencyKey" UUID NOT NULL,
  "requestFingerprint" CHAR(64) NOT NULL,
  "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Application_organizationId_jobId_candidateId_key" UNIQUE ("organizationId", "jobId", "candidateId"),
  CONSTRAINT "Application_organizationId_jobId_idempotencyKey_key" UNIQUE ("organizationId", "jobId", "idempotencyKey"),
  CONSTRAINT "Application_id_organizationId_key" UNIQUE ("id", "organizationId"),
  CONSTRAINT "Application_submittedFirstName_length_check" CHECK (char_length(btrim("submittedFirstName")) BETWEEN 1 AND 100),
  CONSTRAINT "Application_submittedLastName_length_check" CHECK (char_length(btrim("submittedLastName")) BETWEEN 1 AND 100),
  CONSTRAINT "Application_requestFingerprint_check" CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "ApplicationAnswer" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationAnswer_applicationId_questionId_key" UNIQUE ("applicationId", "questionId")
);

CREATE TABLE "CandidateDocument" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "candidateId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "type" "CandidateDocumentType" NOT NULL,
  "objectKey" VARCHAR(512) NOT NULL,
  "originalFilename" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(127) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CandidateDocument_objectKey_key" UNIQUE ("objectKey"),
  CONSTRAINT "CandidateDocument_sizeBytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880)
);

CREATE TABLE "ApplicationUpload" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "objectKey" VARCHAR(512) NOT NULL,
  "originalFilename" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(127) NOT NULL,
  "declaredSizeBytes" INTEGER NOT NULL,
  "status" "ApplicationUploadStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "consumedAt" TIMESTAMPTZ(6),
  "consumedApplicationId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ApplicationUpload_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationUpload_objectKey_key" UNIQUE ("objectKey"),
  CONSTRAINT "ApplicationUpload_consumedApplicationId_key" UNIQUE ("consumedApplicationId"),
  CONSTRAINT "ApplicationUpload_declaredSizeBytes_check" CHECK ("declaredSizeBytes" > 0 AND "declaredSizeBytes" <= 5242880),
  CONSTRAINT "ApplicationUpload_status_consumption_check" CHECK (
    ("status" = 'PENDING' AND "consumedAt" IS NULL AND "consumedApplicationId" IS NULL)
    OR ("status" = 'EXPIRED' AND "consumedAt" IS NULL AND "consumedApplicationId" IS NULL)
    OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "consumedApplicationId" IS NOT NULL)
  )
);

CREATE TABLE "ApplicationStageHistory" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "fromStageId" UUID,
  "toStageId" UUID NOT NULL,
  "event" VARCHAR(64) NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStageHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationStageHistory_event_check" CHECK ("event" = 'APPLICATION_SUBMITTED')
);

-- Composite lookup keys allow child organization ownership to be enforced by
-- PostgreSQL in addition to repository predicates.
CREATE UNIQUE INDEX "Job_id_organizationId_key" ON "Job" ("id", "organizationId");
CREATE UNIQUE INDEX "ApplicationFormQuestion_id_organizationId_key"
  ON "ApplicationFormQuestion" ("id", "organizationId");

ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Application"
  ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_job_organization_fkey" FOREIGN KEY ("jobId", "organizationId") REFERENCES "Job"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_candidate_organization_fkey" FOREIGN KEY ("candidateId", "organizationId") REFERENCES "Candidate"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_formVersion_fkey" FOREIGN KEY ("applicationFormVersionId") REFERENCES "ApplicationFormVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Application_currentPipelineStageId_fkey" FOREIGN KEY ("currentPipelineStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationAnswer"
  ADD CONSTRAINT "ApplicationAnswer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationAnswer_application_organization_fkey" FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ApplicationFormQuestion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationAnswer_question_organization_fkey" FOREIGN KEY ("questionId", "organizationId") REFERENCES "ApplicationFormQuestion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CandidateDocument"
  ADD CONSTRAINT "CandidateDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "CandidateDocument_candidate_organization_fkey" FOREIGN KEY ("candidateId", "organizationId") REFERENCES "Candidate"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "CandidateDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "CandidateDocument_application_organization_fkey" FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationUpload"
  ADD CONSTRAINT "ApplicationUpload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationUpload_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationUpload_job_organization_fkey" FOREIGN KEY ("jobId", "organizationId") REFERENCES "Job"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationUpload_consumedApplicationId_fkey" FOREIGN KEY ("consumedApplicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationStageHistory"
  ADD CONSTRAINT "ApplicationStageHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationStageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationStageHistory_application_organization_fkey" FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationStageHistory_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ApplicationStageHistory_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX "Application_organizationId_jobId_submittedAt_idx" ON "Application" ("organizationId", "jobId", "submittedAt");
CREATE INDEX "Application_applicationFormVersionId_idx" ON "Application" ("applicationFormVersionId");
CREATE INDEX "Application_currentPipelineStageId_idx" ON "Application" ("currentPipelineStageId");
CREATE INDEX "ApplicationAnswer_questionId_idx" ON "ApplicationAnswer" ("questionId");
CREATE INDEX "CandidateDocument_organizationId_candidateId_idx" ON "CandidateDocument" ("organizationId", "candidateId");
CREATE INDEX "CandidateDocument_applicationId_idx" ON "CandidateDocument" ("applicationId");
CREATE INDEX "ApplicationUpload_organizationId_jobId_status_expiresAt_idx" ON "ApplicationUpload" ("organizationId", "jobId", "status", "expiresAt");
CREATE INDEX "ApplicationUpload_expiresAt_idx" ON "ApplicationUpload" ("expiresAt");
CREATE INDEX "ApplicationStageHistory_applicationId_occurredAt_idx" ON "ApplicationStageHistory" ("applicationId", "occurredAt");

-- These relationships cross more than one parent row and cannot be represented
-- by a normal FK. The trigger is deliberately small and provides database
-- protection even for non-HTTP writers.
CREATE FUNCTION "assert_application_relationships"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  version_job_id UUID;
  stage_job_id UUID;
BEGIN
  SELECT f."jobId" INTO version_job_id
  FROM "ApplicationFormVersion" v JOIN "ApplicationForm" f ON f."id" = v."applicationFormId"
  WHERE v."id" = NEW."applicationFormVersionId" AND v."organizationId" = NEW."organizationId" AND v."status" = 'PUBLISHED';
  IF version_job_id IS NULL OR version_job_id <> NEW."jobId" THEN
    RAISE EXCEPTION 'Application form version must be a published version for the application job';
  END IF;
  SELECT p."jobId" INTO stage_job_id FROM "PipelineStage" s JOIN "Pipeline" p ON p."id" = s."pipelineId" WHERE s."id" = NEW."currentPipelineStageId";
  IF stage_job_id IS NULL OR stage_job_id <> NEW."jobId" THEN
    RAISE EXCEPTION 'Application pipeline stage must belong to the application job';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Application_relationships_guard"
BEFORE INSERT OR UPDATE OF "organizationId", "jobId", "applicationFormVersionId", "currentPipelineStageId" ON "Application"
FOR EACH ROW EXECUTE FUNCTION "assert_application_relationships"();

CREATE FUNCTION "assert_application_answer_version"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE answer_version_id UUID;
BEGIN
  SELECT q."applicationFormVersionId" INTO answer_version_id FROM "ApplicationFormQuestion" q WHERE q."id" = NEW."questionId";
  IF answer_version_id IS NULL OR answer_version_id <> (SELECT "applicationFormVersionId" FROM "Application" WHERE "id" = NEW."applicationId") THEN
    RAISE EXCEPTION 'Application answer question must belong to submitted form version';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ApplicationAnswer_version_guard"
BEFORE INSERT OR UPDATE OF "applicationId", "questionId" ON "ApplicationAnswer"
FOR EACH ROW EXECUTE FUNCTION "assert_application_answer_version"();

CREATE FUNCTION "assert_document_and_upload_relationships"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'CandidateDocument' AND NOT EXISTS (
    SELECT 1 FROM "Application" a WHERE a."id" = NEW."applicationId" AND a."candidateId" = NEW."candidateId" AND a."organizationId" = NEW."organizationId"
  ) THEN RAISE EXCEPTION 'Candidate document must belong to its application candidate and organization'; END IF;
  IF TG_TABLE_NAME = 'ApplicationUpload' AND NEW."consumedApplicationId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Application" a WHERE a."id" = NEW."consumedApplicationId" AND a."organizationId" = NEW."organizationId" AND a."jobId" = NEW."jobId"
  ) THEN RAISE EXCEPTION 'Upload can only be consumed by an application for its organization and job'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "CandidateDocument_relationships_guard" BEFORE INSERT OR UPDATE OF "organizationId", "candidateId", "applicationId" ON "CandidateDocument" FOR EACH ROW EXECUTE FUNCTION "assert_document_and_upload_relationships"();
CREATE TRIGGER "ApplicationUpload_consumption_guard" BEFORE INSERT OR UPDATE OF "organizationId", "jobId", "consumedApplicationId" ON "ApplicationUpload" FOR EACH ROW EXECUTE FUNCTION "assert_document_and_upload_relationships"();

CREATE FUNCTION "assert_application_history_stage_relationships"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE expected_job_id UUID; to_job_id UUID; from_job_id UUID;
BEGIN
  SELECT "jobId" INTO expected_job_id FROM "Application" WHERE "id" = NEW."applicationId";
  SELECT p."jobId" INTO to_job_id FROM "PipelineStage" s JOIN "Pipeline" p ON p."id" = s."pipelineId" WHERE s."id" = NEW."toStageId";
  SELECT p."jobId" INTO from_job_id FROM "PipelineStage" s JOIN "Pipeline" p ON p."id" = s."pipelineId" WHERE s."id" = NEW."fromStageId";
  IF expected_job_id IS NULL OR to_job_id IS NULL OR to_job_id <> expected_job_id OR (NEW."fromStageId" IS NOT NULL AND from_job_id <> expected_job_id) THEN
    RAISE EXCEPTION 'Application stage history stages must belong to application job';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ApplicationStageHistory_relationships_guard" BEFORE INSERT OR UPDATE OF "applicationId", "fromStageId", "toStageId" ON "ApplicationStageHistory" FOR EACH ROW EXECUTE FUNCTION "assert_application_history_stage_relationships"();
