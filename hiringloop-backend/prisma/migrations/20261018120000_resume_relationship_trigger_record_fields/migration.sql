-- Each trigger invocation has a table-specific NEW record. A Boolean AND
-- cannot protect references to fields absent from that record during planning.
-- Preserve both ownership checks, but only prepare them in the matching branch.
CREATE OR REPLACE FUNCTION "assert_document_and_upload_relationships"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'CandidateDocument' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = NEW."applicationId"
        AND a."candidateId" = NEW."candidateId"
        AND a."organizationId" = NEW."organizationId"
    ) THEN
      RAISE EXCEPTION 'Candidate document must belong to its application candidate and organization';
    END IF;
  ELSIF TG_TABLE_NAME = 'ApplicationUpload' THEN
    IF NEW."consumedApplicationId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a."id" = NEW."consumedApplicationId"
        AND a."organizationId" = NEW."organizationId"
        AND a."jobId" = NEW."jobId"
    ) THEN
      RAISE EXCEPTION 'Upload can only be consumed by an application for its organization and job';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
