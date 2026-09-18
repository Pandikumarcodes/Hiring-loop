CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorUserId" UUID,
  "actorType" "AuditActorType" NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "resourceType" VARCHAR(64) NOT NULL,
  "resourceId" UUID NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "requestId" UUID,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_actor_check" CHECK (("actorType" = 'USER' AND "actorUserId" IS NOT NULL) OR ("actorType" = 'SYSTEM' AND "actorUserId" IS NULL))
);

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX "AuditEvent_organizationId_occurredAt_id_idx" ON "AuditEvent" ("organizationId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "AuditEvent_organizationId_actorUserId_occurredAt_id_idx" ON "AuditEvent" ("organizationId", "actorUserId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "AuditEvent_organizationId_action_occurredAt_id_idx" ON "AuditEvent" ("organizationId", "action", "occurredAt" DESC, "id" DESC);
CREATE INDEX "AuditEvent_organizationId_resourceType_resourceId_occurredAt_id_idx" ON "AuditEvent" ("organizationId", "resourceType", "resourceId", "occurredAt" DESC, "id" DESC);

CREATE INDEX "Application_organizationId_submittedAt_idx" ON "Application" ("organizationId", "submittedAt");
CREATE INDEX "ApplicationOutcomeEvent_organizationId_type_occurredAt_idx" ON "ApplicationOutcomeEvent" ("organizationId", "type", "occurredAt");
CREATE INDEX "Offer_organizationId_sentAt_idx" ON "Offer" ("organizationId", "sentAt");
CREATE INDEX "Communication_organizationId_createdAt_idx" ON "Communication" ("organizationId", "createdAt");

CREATE FUNCTION phase18_audit_event_immutable_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit events are append-only';
END;
$$;

CREATE TRIGGER "AuditEvent_immutable"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION phase18_audit_event_immutable_guard();
