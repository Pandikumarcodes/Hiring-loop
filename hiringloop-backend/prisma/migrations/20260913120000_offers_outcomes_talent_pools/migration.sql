CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
CREATE TYPE "ApplicationOutcome" AS ENUM ('ACTIVE', 'HIRED', 'REJECTED');
CREATE TYPE "ApplicationOutcomeEventType" AS ENUM ('HIRED', 'REJECTED', 'REOPENED');

ALTER TABLE "Application" ADD COLUMN "outcome" "ApplicationOutcome" NOT NULL DEFAULT 'ACTIVE', ADD COLUMN "outcomeUpdatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "outcomeRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Communication" ADD COLUMN "offerVersionId" UUID;

CREATE TABLE "Offer" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "applicationId" UUID NOT NULL,
  "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT', "currentVersionId" UUID, "createdByUserId" UUID NOT NULL,
  "sentAt" TIMESTAMPTZ(6), "acceptedAt" TIMESTAMPTZ(6), "declinedAt" TIMESTAMPTZ(6), "withdrawnAt" TIMESTAMPTZ(6),
  "acceptedByUserId" UUID, "declinedByUserId" UUID, "withdrawnByUserId" UUID, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id"), CONSTRAINT "Offer_applicationId_key" UNIQUE ("applicationId"), CONSTRAINT "Offer_currentVersionId_key" UNIQUE ("currentVersionId"), CONSTRAINT "Offer_id_organizationId_key" UNIQUE ("id", "organizationId"), CONSTRAINT "Offer_applicationId_organizationId_key" UNIQUE ("applicationId", "organizationId"),
  CONSTRAINT "Offer_revision_positive" CHECK ("revision" > 0)
);
CREATE TABLE "OfferVersion" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "offerId" UUID NOT NULL, "versionNumber" INTEGER NOT NULL,
 "jobTitle" VARCHAR(160) NOT NULL, "currency" CHAR(3) NOT NULL, "baseCompensationMinor" BIGINT NOT NULL, "bonusCompensationMinor" BIGINT,
 "additionalCompensationText" TEXT, "startDate" DATE, "expirationDate" DATE, "location" VARCHAR(160), "workplaceType" "WorkplaceType", "additionalTerms" TEXT,
 "revision" INTEGER NOT NULL DEFAULT 1, "issuedAt" TIMESTAMPTZ(6), "createdByUserId" UUID NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OfferVersion_pkey" PRIMARY KEY ("id"), CONSTRAINT "OfferVersion_offerId_versionNumber_key" UNIQUE ("offerId", "versionNumber"), CONSTRAINT "OfferVersion_id_organizationId_key" UNIQUE ("id", "organizationId"),
 CONSTRAINT "OfferVersion_values_check" CHECK ("versionNumber" > 0 AND "revision" > 0 AND "baseCompensationMinor" >= 0 AND ("bonusCompensationMinor" IS NULL OR "bonusCompensationMinor" >= 0) AND "currency" ~ '^[A-Z]{3}$' AND ("expirationDate" IS NULL OR "startDate" IS NULL OR "expirationDate" >= "startDate"))
);
CREATE TABLE "ApplicationOutcomeEvent" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "applicationId" UUID NOT NULL, "type" "ApplicationOutcomeEventType" NOT NULL,
 "reasonCode" VARCHAR(64), "reasonDetails" VARCHAR(1000), "actorUserId" UUID NOT NULL, "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ApplicationOutcomeEvent_pkey" PRIMARY KEY ("id"), CONSTRAINT "ApplicationOutcomeEvent_reason_check" CHECK (("type" <> 'REJECTED') OR "reasonCode" IS NOT NULL)
);
CREATE TABLE "TalentPool" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "name" VARCHAR(160) NOT NULL, "description" VARCHAR(1000), "createdByUserId" UUID NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TalentPool_pkey" PRIMARY KEY ("id"), CONSTRAINT "TalentPool_organizationId_name_key" UNIQUE ("organizationId", "name"), CONSTRAINT "TalentPool_id_organizationId_key" UNIQUE ("id", "organizationId"), CONSTRAINT "TalentPool_revision_positive" CHECK ("revision" > 0)
);
CREATE TABLE "TalentPoolMember" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "talentPoolId" UUID NOT NULL, "candidateId" UUID NOT NULL, "sourceApplicationId" UUID, "addedByUserId" UUID NOT NULL, "note" VARCHAR(1000), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TalentPoolMember_pkey" PRIMARY KEY ("id"), CONSTRAINT "TalentPoolMember_talentPoolId_candidateId_key" UNIQUE ("talentPoolId", "candidateId")
);

CREATE INDEX "Offer_organizationId_applicationId_idx" ON "Offer"("organizationId", "applicationId");
CREATE INDEX "OfferVersion_offerId_versionNumber_idx" ON "OfferVersion"("offerId", "versionNumber");
CREATE INDEX "ApplicationOutcomeEvent_applicationId_occurredAt_id_idx" ON "ApplicationOutcomeEvent"("applicationId", "occurredAt", "id");
CREATE INDEX "TalentPool_organizationId_name_id_idx" ON "TalentPool"("organizationId", "name", "id");
CREATE INDEX "TalentPoolMember_talentPoolId_createdAt_id_idx" ON "TalentPoolMember"("talentPoolId", "createdAt", "id");
CREATE INDEX "TalentPoolMember_organizationId_candidateId_idx" ON "TalentPoolMember"("organizationId", "candidateId");

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_organizationId_fkey" FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OfferVersion" ADD CONSTRAINT "OfferVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OfferVersion" ADD CONSTRAINT "OfferVersion_offerId_organizationId_fkey" FOREIGN KEY ("offerId", "organizationId") REFERENCES "Offer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OfferVersion" ADD CONSTRAINT "OfferVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "OfferVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_offerVersionId_organizationId_fkey" FOREIGN KEY ("offerVersionId", "organizationId") REFERENCES "OfferVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationOutcomeEvent" ADD CONSTRAINT "ApplicationOutcomeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationOutcomeEvent" ADD CONSTRAINT "ApplicationOutcomeEvent_applicationId_organizationId_fkey" FOREIGN KEY ("applicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ApplicationOutcomeEvent" ADD CONSTRAINT "ApplicationOutcomeEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPool" ADD CONSTRAINT "TalentPool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPool" ADD CONSTRAINT "TalentPool_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_talentPoolId_organizationId_fkey" FOREIGN KEY ("talentPoolId", "organizationId") REFERENCES "TalentPool"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_candidateId_organizationId_fkey" FOREIGN KEY ("candidateId", "organizationId") REFERENCES "Candidate"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_sourceApplicationId_organizationId_fkey" FOREIGN KEY ("sourceApplicationId", "organizationId") REFERENCES "Application"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TalentPoolMember" ADD CONSTRAINT "TalentPoolMember_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION phase17_offer_integrity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."currentVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "OfferVersion" v WHERE v.id = NEW."currentVersionId" AND v."offerId" = NEW.id AND v."organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'current offer version must belong to offer'; END IF; RETURN NEW; END $$;
CREATE FUNCTION phase17_communication_integrity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."offerVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "OfferVersion" v JOIN "Offer" o ON o.id=v."offerId" WHERE v.id=NEW."offerVersionId" AND o."applicationId"=NEW."applicationId" AND v."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'offer version must match communication application'; END IF; RETURN NEW; END $$;
CREATE FUNCTION phase17_member_integrity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."sourceApplicationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Application" a WHERE a.id=NEW."sourceApplicationId" AND a."candidateId"=NEW."candidateId" AND a."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'source application must belong to candidate'; END IF; RETURN NEW; END $$;
CREATE TRIGGER "Offer_phase17_guard" BEFORE INSERT OR UPDATE ON "Offer" FOR EACH ROW EXECUTE FUNCTION phase17_offer_integrity_guard();
CREATE TRIGGER "Communication_phase17_guard" BEFORE INSERT OR UPDATE ON "Communication" FOR EACH ROW EXECUTE FUNCTION phase17_communication_integrity_guard();
CREATE TRIGGER "TalentPoolMember_phase17_guard" BEFORE INSERT OR UPDATE ON "TalentPoolMember" FOR EACH ROW EXECUTE FUNCTION phase17_member_integrity_guard();
CREATE FUNCTION phase17_offer_version_immutable_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."issuedAt" IS NOT NULL THEN RAISE EXCEPTION 'issued offer versions are immutable'; END IF; RETURN NEW; END $$;
CREATE FUNCTION phase17_outcome_event_immutable_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'outcome events are immutable'; END $$;
CREATE TRIGGER "OfferVersion_immutable" BEFORE UPDATE OR DELETE ON "OfferVersion" FOR EACH ROW EXECUTE FUNCTION phase17_offer_version_immutable_guard();
CREATE TRIGGER "ApplicationOutcomeEvent_immutable" BEFORE UPDATE OR DELETE ON "ApplicationOutcomeEvent" FOR EACH ROW EXECUTE FUNCTION phase17_outcome_event_immutable_guard();
