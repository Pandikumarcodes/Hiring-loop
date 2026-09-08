CREATE TYPE "ScorecardTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "ScorecardCriterionType" AS ENUM ('RATING', 'TEXT');
CREATE TYPE "ScorecardStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "ScorecardRecommendation" AS ENUM ('STRONG_NO', 'NO', 'MIXED', 'YES', 'STRONG_YES');

CREATE TABLE "ScorecardTemplate" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "jobId" UUID NOT NULL,
  "activeVersionId" UUID, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "ScorecardTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScorecardTemplate_jobId_key" UNIQUE ("jobId"),
  CONSTRAINT "ScorecardTemplate_activeVersionId_key" UNIQUE ("activeVersionId")
);
CREATE TABLE "ScorecardTemplateVersion" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "templateId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL, "status" "ScorecardTemplateVersionStatus" NOT NULL,
  "title" VARCHAR(160) NOT NULL, "instructions" TEXT, "revision" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMPTZ(6), "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ScorecardTemplateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScorecardTemplateVersion_templateId_versionNumber_key" UNIQUE ("templateId", "versionNumber"),
  CONSTRAINT "ScorecardTemplateVersion_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 160),
  CONSTRAINT "ScorecardTemplateVersion_state_check" CHECK (("status" = 'DRAFT' AND "publishedAt" IS NULL) OR ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL))
);
CREATE TABLE "ScorecardCriterion" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "templateVersionId" UUID NOT NULL,
  "label" VARCHAR(300) NOT NULL, "description" TEXT, "type" "ScorecardCriterionType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false, "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ScorecardCriterion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScorecardCriterion_templateVersionId_position_key" UNIQUE ("templateVersionId", "position"),
  CONSTRAINT "ScorecardCriterion_label_check" CHECK (char_length(btrim("label")) BETWEEN 1 AND 300),
  CONSTRAINT "ScorecardCriterion_position_check" CHECK ("position" > 0)
);
CREATE TABLE "Scorecard" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "interviewId" UUID NOT NULL,
  "interviewParticipantId" UUID NOT NULL, "templateVersionId" UUID NOT NULL,
  "status" "ScorecardStatus" NOT NULL DEFAULT 'DRAFT', "overallRecommendation" "ScorecardRecommendation",
  "overallComment" TEXT, "revision" INTEGER NOT NULL DEFAULT 1, "submittedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Scorecard_interviewParticipantId_key" UNIQUE ("interviewParticipantId"),
  CONSTRAINT "Scorecard_submission_state_check" CHECK (("status" = 'DRAFT' AND "submittedAt" IS NULL) OR ("status" = 'SUBMITTED' AND "submittedAt" IS NOT NULL AND "overallRecommendation" IS NOT NULL))
);
CREATE TABLE "ScorecardResponse" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "scorecardId" UUID NOT NULL, "criterionId" UUID NOT NULL,
  "ratingValue" INTEGER, "textValue" TEXT, "comment" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ScorecardResponse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScorecardResponse_scorecardId_criterionId_key" UNIQUE ("scorecardId", "criterionId"),
  CONSTRAINT "ScorecardResponse_rating_check" CHECK ("ratingValue" IS NULL OR "ratingValue" BETWEEN 1 AND 5)
);
CREATE TABLE "Note" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "applicationId" UUID NOT NULL, "authorUserId" UUID NOT NULL,
  "body" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id"), CONSTRAINT "Note_body_check" CHECK (char_length(btrim("body")) BETWEEN 1 AND 10000)
);
ALTER TABLE "ScorecardTemplate" ADD CONSTRAINT "ScorecardTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScorecardTemplateVersion" ADD CONSTRAINT "ScorecardTemplateVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScorecardTemplate"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardTemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScorecardTemplate" ADD CONSTRAINT "ScorecardTemplate_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ScorecardTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScorecardCriterion" ADD CONSTRAINT "ScorecardCriterion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardCriterion_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ScorecardTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Scorecard_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Scorecard_interviewParticipantId_fkey" FOREIGN KEY ("interviewParticipantId") REFERENCES "InterviewParticipant"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Scorecard_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ScorecardTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScorecardResponse" ADD CONSTRAINT "ScorecardResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardResponse_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "ScorecardResponse_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ScorecardCriterion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Note_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT "Note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE UNIQUE INDEX "ScorecardTemplate_one_draft_per_template" ON "ScorecardTemplateVersion" ("templateId") WHERE "status" = 'DRAFT';
CREATE INDEX "ScorecardTemplate_organizationId_jobId_idx" ON "ScorecardTemplate" ("organizationId", "jobId");
CREATE INDEX "ScorecardTemplateVersion_templateId_status_idx" ON "ScorecardTemplateVersion" ("templateId", "status");
CREATE INDEX "Scorecard_organizationId_interviewId_status_idx" ON "Scorecard" ("organizationId", "interviewId", "status");
CREATE INDEX "Scorecard_interviewId_idx" ON "Scorecard" ("interviewId");
CREATE INDEX "Note_organizationId_applicationId_createdAt_idx" ON "Note" ("organizationId", "applicationId", "createdAt");

CREATE FUNCTION scorecard_template_active_version_guard() RETURNS trigger AS $$
BEGIN
 IF NEW."activeVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ScorecardTemplateVersion" v WHERE v.id=NEW."activeVersionId" AND v."templateId"=NEW.id AND v."organizationId"=NEW."organizationId" AND v.status='PUBLISHED') THEN RAISE EXCEPTION 'scorecard active version must be a published version of this template'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "ScorecardTemplate_active_version_guard" BEFORE INSERT OR UPDATE OF "organizationId", "activeVersionId" ON "ScorecardTemplate" FOR EACH ROW EXECUTE FUNCTION scorecard_template_active_version_guard();

CREATE FUNCTION scorecard_relationship_guard() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "InterviewParticipant" p JOIN "Interview" i ON i.id=p."interviewId" WHERE p.id=NEW."interviewParticipantId" AND i.id=NEW."interviewId" AND i."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'scorecard interview, participant, and organization must agree'; END IF;
 IF NOT EXISTS (SELECT 1 FROM "ScorecardTemplateVersion" v JOIN "ScorecardTemplate" t ON t.id=v."templateId" JOIN "Interview" i ON i.id=NEW."interviewId" JOIN "Application" a ON a.id=i."applicationId" WHERE v.id=NEW."templateVersionId" AND v."organizationId"=NEW."organizationId" AND t."organizationId"=NEW."organizationId" AND a."organizationId"=NEW."organizationId" AND t."jobId"=a."jobId" AND v.status='PUBLISHED') THEN RAISE EXCEPTION 'scorecard template version must be the published template for the interview job'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "Scorecard_relationship_guard" BEFORE INSERT OR UPDATE ON "Scorecard" FOR EACH ROW EXECUTE FUNCTION scorecard_relationship_guard();
CREATE FUNCTION scorecard_response_guard() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "Scorecard" s JOIN "ScorecardCriterion" c ON c.id=NEW."criterionId" WHERE s.id=NEW."scorecardId" AND s."organizationId"=NEW."organizationId" AND c."organizationId"=NEW."organizationId" AND c."templateVersionId"=s."templateVersionId") THEN RAISE EXCEPTION 'scorecard response criterion must belong to pinned version'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "ScorecardResponse_relationship_guard" BEFORE INSERT OR UPDATE ON "ScorecardResponse" FOR EACH ROW EXECUTE FUNCTION scorecard_response_guard();

CREATE FUNCTION scorecard_template_version_immutable_guard() RETURNS trigger AS $$
BEGIN
 IF OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'published scorecard template versions are immutable'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "ScorecardTemplateVersion_immutable_guard" BEFORE UPDATE OR DELETE ON "ScorecardTemplateVersion" FOR EACH ROW EXECUTE FUNCTION scorecard_template_version_immutable_guard();
CREATE FUNCTION scorecard_criterion_draft_guard() RETURNS trigger AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF EXISTS (SELECT 1 FROM "ScorecardTemplateVersion" v WHERE v.id=OLD."templateVersionId" AND v.status='PUBLISHED') THEN RAISE EXCEPTION 'published scorecard template criteria are immutable'; END IF;
 ELSIF EXISTS (SELECT 1 FROM "ScorecardTemplateVersion" v WHERE v.id=NEW."templateVersionId" AND v.status='PUBLISHED') THEN RAISE EXCEPTION 'published scorecard template criteria are immutable'; END IF;
 RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "ScorecardCriterion_draft_guard" BEFORE INSERT OR UPDATE OR DELETE ON "ScorecardCriterion" FOR EACH ROW EXECUTE FUNCTION scorecard_criterion_draft_guard();
CREATE FUNCTION note_relationship_guard() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "Application" a WHERE a.id=NEW."applicationId" AND a."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'note application and organization must agree'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "Note_relationship_guard" BEFORE INSERT OR UPDATE OF "organizationId", "applicationId" ON "Note" FOR EACH ROW EXECUTE FUNCTION note_relationship_guard();
