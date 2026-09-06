-- CreateEnum
CREATE TYPE "PipelineStageKind" AS ENUM ('ENTRY', 'STANDARD');

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Pipeline_jobId_key" UNIQUE ("jobId"),
    CONSTRAINT "Pipeline_version_check" CHECK ("version" >= 1)
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "kind" "PipelineStageKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PipelineStage_pipelineId_position_key" UNIQUE ("pipelineId", "position"),
    CONSTRAINT "PipelineStage_pipelineId_normalizedName_key" UNIQUE ("pipelineId", "normalizedName"),
    CONSTRAINT "PipelineStage_position_check" CHECK ("position" >= 1),
    CONSTRAINT "PipelineStage_name_length_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80),
    CONSTRAINT "PipelineStage_normalizedName_length_check" CHECK (char_length("normalizedName") BETWEEN 1 AND 80)
);

ALTER TABLE "Pipeline"
ADD CONSTRAINT "Pipeline_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "PipelineStage"
ADD CONSTRAINT "PipelineStage_pipelineId_fkey"
FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- PostgreSQL partial uniqueness is intentionally migration-managed because Prisma
-- schema syntax cannot express it. It enforces maximum one ENTRY stage per
-- Pipeline; the required existence of an ENTRY remains aggregate/service-owned.
CREATE UNIQUE INDEX "PipelineStage_one_entry_per_pipeline_key"
ON "PipelineStage" ("pipelineId")
WHERE "kind" = 'ENTRY';

-- Migration SQL cannot call the application UUIDv7 helper. This deterministic
-- UUIDv7-shaped mapper uses the Job creation timestamp plus a stable MD5 seed.
-- It needs no database extension, produces valid UUID version/variant bits, and
-- gives a stable ID for every Job/default-stage pair if this migration is rerun
-- against the same pre-migration data.
CREATE FUNCTION "pipeline_uuidv7_from_seed"(seed TEXT, occurred_at TIMESTAMPTZ)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  timestamp_hex TEXT := lpad(to_hex(floor(extract(epoch FROM occurred_at) * 1000)::BIGINT), 12, '0');
  digest TEXT := md5(seed);
  variant TEXT := substr('89ab', (ascii(substr(digest, 4, 1)) % 4) + 1, 1);
BEGIN
  RETURN format(
    '%s-%s-%s-%s-%s',
    substr(timestamp_hex, 1, 8),
    substr(timestamp_hex, 9, 4),
    '7' || substr(digest, 1, 3),
    variant || substr(digest, 5, 3),
    substr(digest, 8, 12)
  )::UUID;
END;
$$;

-- Existing Phase 08 Jobs receive exactly one default Pipeline. The anti-join
-- makes the backfill safe if a controlled migration recovery has already
-- inserted any Pipeline rows.
INSERT INTO "Pipeline" ("id", "jobId", "version", "createdAt", "updatedAt")
SELECT
  "pipeline_uuidv7_from_seed"('pipeline:' || j."id"::TEXT, j."createdAt"),
  j."id",
  1,
  j."createdAt",
  j."updatedAt"
FROM "Job" j
LEFT JOIN "Pipeline" p ON p."jobId" = j."id"
WHERE p."id" IS NULL;

INSERT INTO "PipelineStage" (
  "id", "pipelineId", "name", "normalizedName", "kind", "position", "createdAt", "updatedAt"
)
SELECT
  "pipeline_uuidv7_from_seed"('pipeline-stage:' || p."jobId"::TEXT || ':' || d.position::TEXT, p."createdAt"),
  p."id",
  d.name,
  lower(d.name),
  d.kind::"PipelineStageKind",
  d.position,
  p."createdAt",
  p."updatedAt"
FROM "Pipeline" p
CROSS JOIN (
  VALUES
    ('Applied', 'ENTRY', 1),
    ('Screening', 'STANDARD', 2),
    ('Interview', 'STANDARD', 3),
    ('Offer', 'STANDARD', 4)
) AS d(name, kind, position)
LEFT JOIN "PipelineStage" s
  ON s."pipelineId" = p."id" AND s."position" = d.position
WHERE s."id" IS NULL;

DROP FUNCTION "pipeline_uuidv7_from_seed"(TEXT, TIMESTAMPTZ);
