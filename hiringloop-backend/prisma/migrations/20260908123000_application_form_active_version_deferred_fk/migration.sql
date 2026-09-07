-- RESTRICT checks are always immediate in PostgreSQL, even when declared
-- DEFERRABLE. NO ACTION is equally restrictive at commit time and permits the
-- intentional circular ApplicationForm <-> active-version relationship to be
-- created or removed atomically inside a deferred transaction.
ALTER TABLE "ApplicationForm"
  DROP CONSTRAINT "ApplicationForm_activeVersionId_fkey";

ALTER TABLE "ApplicationForm"
  ADD CONSTRAINT "ApplicationForm_activeVersionId_fkey"
  FOREIGN KEY ("activeVersionId") REFERENCES "ApplicationFormVersion"("id")
  ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
