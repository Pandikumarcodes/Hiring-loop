import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';

import {
  applicationFormUnavailableError,
  applicationStorageUnavailableError,
  applicationUploadAlreadyConsumedError,
  applicationUploadExpiredError,
  duplicateApplicationError,
  fileTooLargeError,
  fileTypeNotAllowedError,
  idempotencyConflictError,
  initialPipelineStageUnavailableError,
  invalidApplicationAnswerError,
  invalidApplicationUploadError,
  invalidFormVersionError,
  jobNotAcceptingApplicationsError,
  notFoundError,
  requiredAnswerMissingError,
} from '../../../errors/application-error.js';
import { normalizeEmail } from '../../auth/domain/normalize-email.js';
import { generateEntityId } from '../../../utils/ids.js';
import { UploadUnavailableDuringCommitError } from '../repositories/application-repository.js';
import {
  toApplicationConfirmationDto,
  toPublicApplicationFormDto,
  toUploadReservationDto,
} from '../domain/application-dto.js';
import {
  StorageObjectNotFoundError,
  StorageProviderError,
} from '../storage/application-storage.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_SHORT_TEXT = 500;
const MAX_LONG_TEXT = 10_000;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(input) {
  const canonical = {
    candidate: {
      firstName: input.candidate.firstName,
      lastName: input.candidate.lastName,
      email: input.candidate.normalizedEmail,
      phone: input.candidate.phone ?? null,
    },
    formVersionId: input.formVersionId,
    resumeUploadId: input.resumeUploadId,
    answers: [...input.answers]
      .map(({ questionId, value }) => ({ questionId, value }))
      .sort((a, b) => a.questionId.localeCompare(b.questionId)),
  };
  return createHash('sha256').update(stableJson(canonical)).digest('hex');
}

function normalizeCandidate(candidate) {
  return {
    firstName: candidate.firstName.trim(),
    lastName: candidate.lastName.trim(),
    email: candidate.email.trim(),
    normalizedEmail: normalizeEmail(candidate.email),
    phone: candidate.phone?.trim() || null,
  };
}

function ensureMimeType(mimeType) {
  if (!ALLOWED_MIME_TYPES.has(mimeType?.toLowerCase())) {
    throw fileTypeNotAllowedError();
  }
}

function isIsoDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validateAnswers(version, submittedAnswers) {
  const questions = new Map(
    version.questions.map((question) => [question.id, question]),
  );
  const submitted = new Map();
  for (const answer of submittedAnswers) {
    if (submitted.has(answer.questionId)) throw invalidApplicationAnswerError();
    const question = questions.get(answer.questionId);
    if (!question) throw invalidApplicationAnswerError();
    submitted.set(answer.questionId, { question, value: answer.value });
  }
  for (const question of version.questions) {
    if (question.required && !submitted.has(question.id)) {
      throw requiredAnswerMissingError();
    }
  }
  return [...submitted.values()].map(({ question, value }) => ({
    questionId: question.id,
    value: validateAnswerValue(question, value),
  }));
}

function validateAnswerValue(question, value) {
  switch (question.type) {
    case 'SHORT_TEXT':
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.trim().length > MAX_SHORT_TEXT
      )
        throw invalidApplicationAnswerError();
      return value.trim();
    case 'LONG_TEXT':
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.trim().length > MAX_LONG_TEXT
      )
        throw invalidApplicationAnswerError();
      return value.trim();
    case 'NUMBER':
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw invalidApplicationAnswerError();
      return value;
    case 'YES_NO':
      if (typeof value !== 'boolean') throw invalidApplicationAnswerError();
      return value;
    case 'DATE':
      if (!isIsoDate(value)) throw invalidApplicationAnswerError();
      return value;
    case 'URL':
      if (!isHttpUrl(value)) throw invalidApplicationAnswerError();
      return value;
    case 'SINGLE_SELECT': {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).length !== 1 ||
        typeof value.optionId !== 'string' ||
        !question.options.some((option) => option.id === value.optionId)
      )
        throw invalidApplicationAnswerError();
      return { optionId: value.optionId };
    }
    case 'MULTI_SELECT': {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).length !== 1 ||
        !Array.isArray(value.optionIds) ||
        value.optionIds.length === 0 ||
        value.optionIds.length > question.options.length ||
        value.optionIds.some((id) => typeof id !== 'string') ||
        new Set(value.optionIds).size !== value.optionIds.length ||
        value.optionIds.some(
          (id) => !question.options.some((option) => option.id === id),
        )
      )
        throw invalidApplicationAnswerError();
      return { optionIds: value.optionIds };
    }
    default:
      throw invalidApplicationAnswerError();
  }
}

function isUniqueConstraint(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function createPublicApplicationUseCases({
  organizationRepository,
  jobRepository,
  applicationRepository,
  storage,
  uploadTtlSeconds,
  maxUploadBytes,
  clock = () => new Date(),
  id = generateEntityId,
}) {
  async function organizationFor(slug) {
    const organization =
      await organizationRepository.findPublicOrganizationBySlug(slug);
    if (!organization) throw notFoundError();
    return organization;
  }

  async function publicJob(organizationId, jobId) {
    const job = await jobRepository.findPublicApplicationJobForOrganization({
      organizationId,
      jobId,
    });
    if (!job) throw notFoundError();
    return job;
  }

  async function openPublicJob(organizationId, jobId) {
    const job = await jobRepository.findOpenPublicJobForOrganization({
      organizationId,
      jobId,
    });
    if (!job) throw notFoundError();
    return job;
  }

  async function verifyUpload({ upload, organizationId }) {
    if (!upload) throw invalidApplicationUploadError();
    if (upload.status === 'CONSUMED')
      throw applicationUploadAlreadyConsumedError();
    if (upload.status === 'EXPIRED' || upload.expiresAt <= clock())
      throw applicationUploadExpiredError();
    if (
      upload.objectKey !==
      `organizations/${organizationId}/application-uploads/${upload.id}`
    )
      throw invalidApplicationUploadError();
    ensureMimeType(upload.mimeType);
    if (upload.declaredSizeBytes > maxUploadBytes) throw fileTooLargeError();
    try {
      const object = await storage.headObject({ objectKey: upload.objectKey });
      if (
        !Number.isInteger(object.contentLength) ||
        object.contentLength <= 0 ||
        object.contentLength > maxUploadBytes ||
        object.contentLength !== upload.declaredSizeBytes
      )
        throw invalidApplicationUploadError();
      ensureMimeType(object.contentType);
      if (object.contentType.toLowerCase() !== upload.mimeType.toLowerCase())
        throw invalidApplicationUploadError();
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError)
        throw invalidApplicationUploadError();
      if (error instanceof StorageProviderError)
        throw applicationStorageUnavailableError();
      throw error;
    }
  }

  function confirmation(existing, requestFingerprint) {
    if (existing.requestFingerprint !== requestFingerprint)
      throw idempotencyConflictError();
    return toApplicationConfirmationDto(existing);
  }

  return {
    async form({ organizationSlug, jobId }) {
      const organization = await organizationFor(organizationSlug);
      await openPublicJob(organization.id, jobId);
      const form = await applicationRepository.findActivePublishedForm({
        organizationId: organization.id,
        jobId,
      });
      if (!form?.activeVersion) throw applicationFormUnavailableError();
      return toPublicApplicationFormDto(form);
    },

    async authorizeUpload({
      organizationSlug,
      jobId,
      filename,
      mimeType,
      sizeBytes,
    }) {
      const organization = await organizationFor(organizationSlug);
      await openPublicJob(organization.id, jobId);
      ensureMimeType(mimeType);
      if (sizeBytes > maxUploadBytes) throw fileTooLargeError();
      const uploadId = id();
      const now = clock();
      const upload = await applicationRepository.createUploadReservation({
        id: uploadId,
        organizationId: organization.id,
        jobId,
        objectKey: `organizations/${organization.id}/application-uploads/${uploadId}`,
        originalFilename: filename.trim(),
        mimeType: mimeType.toLowerCase(),
        declaredSizeBytes: sizeBytes,
        expiresAt: new Date(now.getTime() + uploadTtlSeconds * 1000),
      });
      try {
        const signedUpload = await storage.createSignedPutUrl({
          objectKey: upload.objectKey,
          mimeType: upload.mimeType,
          expiresIn: uploadTtlSeconds,
        });
        return toUploadReservationDto(upload, signedUpload);
      } catch (error) {
        if (error instanceof StorageProviderError)
          throw applicationStorageUnavailableError();
        throw error;
      }
    },

    async submit({ organizationSlug, jobId, idempotencyKey, ...input }) {
      const organization = await organizationFor(organizationSlug);
      const candidate = normalizeCandidate(input.candidate);
      const requestFingerprint = fingerprint({ ...input, candidate });
      const job = await publicJob(organization.id, jobId);
      const existing = await applicationRepository.findIdempotentApplication({
        organizationId: organization.id,
        jobId,
        idempotencyKey,
      });
      if (existing) return confirmation(existing, requestFingerprint);
      if (job.status !== 'OPEN') throw jobNotAcceptingApplicationsError();

      const version = await applicationRepository.findPublishedFormVersion({
        organizationId: organization.id,
        jobId,
        formVersionId: input.formVersionId,
      });
      if (!version) throw invalidFormVersionError();
      const answers = validateAnswers(version, input.answers);
      const upload = await applicationRepository.findUpload({
        organizationId: organization.id,
        jobId,
        uploadId: input.resumeUploadId,
      });
      await verifyUpload({ upload, organizationId: organization.id });
      const initialStage = await applicationRepository.findInitialStage({
        organizationId: organization.id,
        jobId,
      });
      if (!initialStage) throw initialPipelineStageUnavailableError();

      try {
        const application = await applicationRepository.createAtomicSubmission({
          organizationId: organization.id,
          jobId,
          candidate,
          formVersionId: version.id,
          initialStageId: initialStage.id,
          answers,
          upload,
          idempotencyKey,
          requestFingerprint,
          id,
          now: clock(),
        });
        return toApplicationConfirmationDto(application);
      } catch (error) {
        if (error instanceof UploadUnavailableDuringCommitError) {
          throw applicationUploadAlreadyConsumedError();
        }
        if (!isUniqueConstraint(error)) throw error;
        const replay = await applicationRepository.findIdempotentApplication({
          organizationId: organization.id,
          jobId,
          idempotencyKey,
        });
        if (replay) return confirmation(replay, requestFingerprint);
        throw duplicateApplicationError();
      }
    },
  };
}

export { validateAnswers };
