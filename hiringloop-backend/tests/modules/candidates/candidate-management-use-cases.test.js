import { describe, expect, it, vi } from 'vitest';

import { StorageProviderError } from '../../../src/modules/applications/storage/application-storage.js';
import { createCandidateManagementUseCases } from '../../../src/modules/candidates/use-cases/candidate-management-use-cases.js';

const now = new Date('2026-09-07T12:00:00.000Z');

function makeUseCases(overrides = {}) {
  const repository = {
    list: vi.fn(async () => ({
      candidates: [
        {
          candidateId: 'candidate-1',
          name: 'Ada Lovelace',
          email: 'ada@example.test',
          applicationCount: 2,
          applicationId: 'application-2',
          jobId: 'job-2',
          jobTitle: 'Engineer',
          stageId: 'stage-1',
          stageName: 'Applied',
          submittedAt: now,
        },
      ],
      totalItems: 1,
    })),
    findCandidate: vi.fn(async () => null),
    findApplication: vi.fn(async () => null),
    findDocument: vi.fn(async () => ({
      id: 'document-1',
      objectKey: 'organizations/org-1/application-uploads/upload-1',
      originalFilename: 'resume.pdf',
      mimeType: 'application/pdf',
    })),
    ...overrides.repository,
  };
  const storage = {
    createSignedGetUrl: vi.fn(async () => 'https://s3.example.test/signed-get'),
    ...overrides.storage,
  };
  return {
    repository,
    storage,
    useCases: createCandidateManagementUseCases({
      repository,
      storage,
      clock: () => now,
    }),
  };
}

describe('candidate management use cases', () => {
  it('includes outcome state and chronological history in the existing application detail DTO', async () => {
    const { useCases } = makeUseCases({
      repository: {
        findApplication: async () => ({
          id: 'application-1',
          submittedAt: now,
          applicationFormVersionId: 'form-1',
          outcome: 'REJECTED',
          outcomeRevision: 3,
          outcomeUpdatedAt: now,
          candidate: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.test',
            phone: null,
          },
          job: { id: 'job-1', title: 'Engineer' },
          currentStage: null,
          answers: [],
          documents: [],
          stageHistory: [],
          outcomeEvents: [
            {
              id: 'event-1',
              type: 'REJECTED',
              reasonCode: 'QUALIFICATIONS',
              reasonDetails: 'Missing required experience',
              occurredAt: now,
            },
          ],
        }),
      },
    });
    await expect(
      useCases.applicationDetail({
        organizationId: 'org-1',
        applicationId: 'application-1',
      }),
    ).resolves.toMatchObject({
      outcome: 'REJECTED',
      outcomeRevision: 3,
      outcomeHistory: [
        {
          type: 'REJECTED',
          reasonCode: 'QUALIFICATIONS',
          reasonDetails: 'Missing required experience',
        },
      ],
    });
  });
  it('returns lightweight candidate rows with server pagination metadata', async () => {
    const { useCases, repository } = makeUseCases();
    const result = await useCases.list({
      organizationId: 'org-1',
      page: 1,
      pageSize: 25,
      sort: 'newestApplication',
    });
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', pageSize: 25 }),
    );
    expect(result).toEqual({
      candidates: [
        expect.objectContaining({
          id: 'candidate-1',
          applicationCount: 2,
          latestApplication: expect.objectContaining({ id: 'application-2' }),
        }),
      ],
      pagination: { page: 1, limit: 25, totalItems: 1, totalPages: 1 },
    });
  });

  it('uses tenant-scoped lookups for candidate, application, and document resources', async () => {
    const { useCases, repository } = makeUseCases();
    await expect(
      useCases.candidateDetail({
        organizationId: 'org-foreign',
        candidateId: 'candidate-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      useCases.applicationDetail({
        organizationId: 'org-foreign',
        applicationId: 'application-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await useCases.accessDocument({
      organizationId: 'org-1',
      documentId: 'document-1',
    });
    expect(repository.findDocument).toHaveBeenCalledWith({
      organizationId: 'org-1',
      documentId: 'document-1',
    });
  });

  it('creates a five-minute document capability without returning the object key', async () => {
    const { useCases, storage } = makeUseCases();
    await expect(
      useCases.accessDocument({
        organizationId: 'org-1',
        documentId: 'document-1',
      }),
    ).resolves.toEqual({
      url: 'https://s3.example.test/signed-get',
      expiresAt: new Date('2026-09-07T12:05:00.000Z'),
      fileName: 'resume.pdf',
      contentType: 'application/pdf',
    });
    expect(storage.createSignedGetUrl).toHaveBeenCalledWith({
      objectKey: 'organizations/org-1/application-uploads/upload-1',
      expiresIn: 300,
    });
  });

  it('maps storage provider failures to the existing safe service error', async () => {
    const { useCases } = makeUseCases({
      storage: {
        createSignedGetUrl: async () => {
          throw new StorageProviderError();
        },
      },
    });
    await expect(
      useCases.accessDocument({
        organizationId: 'org-1',
        documentId: 'document-1',
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_STORAGE_UNAVAILABLE' });
  });
});
