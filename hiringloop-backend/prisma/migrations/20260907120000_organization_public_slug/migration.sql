-- Phase 10 public organization identity. Slugs are globally unique, immutable
-- after creation, and are backfilled deterministically for existing tenants.
ALTER TABLE "Organization" ADD COLUMN "slug" VARCHAR(63);

-- The temporary lookup index keeps collision probing efficient during the
-- non-empty-database backfill. It is replaced by the unique index below.
CREATE INDEX "Organization_slug_backfill_idx" ON "Organization"("slug");

CREATE FUNCTION "organization_slug_base"(source_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(btrim(source_name));
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
  normalized := btrim(normalized, '-');

  IF char_length(normalized) < 3 THEN
    RETURN 'organization';
  END IF;

  RETURN btrim(left(normalized, 63), '-');
END;
$$;

DO $$
DECLARE
  organization_row RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix_number INTEGER;
  suffix TEXT;
BEGIN
  -- createdAt then UUIDv7 ID gives a stable ordering for duplicate names.
  FOR organization_row IN
    SELECT "id", "name"
    FROM "Organization"
    ORDER BY "createdAt" ASC, "id" ASC
  LOOP
    base_slug := "organization_slug_base"(organization_row."name");
    suffix_number := 1;

    LOOP
      suffix := CASE WHEN suffix_number = 1 THEN '' ELSE '-' || suffix_number::TEXT END;
      candidate_slug := btrim(left(base_slug, 63 - char_length(suffix)), '-') || suffix;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Organization" WHERE "slug" = candidate_slug
      );
      suffix_number := suffix_number + 1;
    END LOOP;

    UPDATE "Organization"
    SET "slug" = candidate_slug
    WHERE "id" = organization_row."id";
  END LOOP;
END;
$$;

DROP FUNCTION "organization_slug_base"(TEXT);

ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_slug_format_check"
CHECK (
  char_length("slug") BETWEEN 3 AND 63
  AND "slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
);

DROP INDEX "Organization_slug_backfill_idx";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Future public list queries filter OPEN jobs by tenant and order by openedAt.
CREATE INDEX "Job_organizationId_status_openedAt_idx"
ON "Job"("organizationId", "status", "openedAt");
