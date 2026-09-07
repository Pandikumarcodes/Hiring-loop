-- Enforce that an active version is both owned by the form and its tenant.
-- The ordinary activeVersionId FK proves only that a version exists; this
-- composite FK also binds that version to this ApplicationForm row.
CREATE UNIQUE INDEX "ApplicationFormVersion_id_applicationFormId_organizationId_key"
  ON "ApplicationFormVersion" ("id", "applicationFormId", "organizationId");

ALTER TABLE "ApplicationForm"
  ADD CONSTRAINT "ApplicationForm_activeVersionId_form_organization_fkey"
  FOREIGN KEY ("activeVersionId", "id", "organizationId")
  REFERENCES "ApplicationFormVersion" ("id", "applicationFormId", "organizationId")
  ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
