import {
  applicationStorageUnavailableError,
  notFoundError,
} from '../../../errors/application-error.js';
import { StorageProviderError } from '../../applications/storage/application-storage.js';
import {
  toApplicationDetailDto,
  toCandidateDetailDto,
  toCandidateListItemDto,
} from '../domain/candidate-management-dto.js';

const DOCUMENT_ACCESS_TTL_SECONDS = 300;

export function createCandidateManagementUseCases({
  repository,
  storage,
  clock = () => new Date(),
}) {
  return {
    async list(input) {
      const result = await repository.list(input);
      return {
        candidates: result.candidates.map(toCandidateListItemDto),
        pagination: {
          page: input.page,
          limit: input.pageSize,
          totalItems: Number(result.totalItems),
          totalPages: Math.ceil(Number(result.totalItems) / input.pageSize),
        },
      };
    },

    async candidateDetail({ organizationId, candidateId }) {
      const candidate = await repository.findCandidate({
        organizationId,
        candidateId,
      });
      if (!candidate) throw notFoundError();
      return toCandidateDetailDto(candidate);
    },

    async applicationDetail({ organizationId, applicationId }) {
      const application = await repository.findApplication({
        organizationId,
        applicationId,
      });
      if (!application) throw notFoundError();
      return toApplicationDetailDto(application);
    },

    async accessDocument({ organizationId, documentId }) {
      const document = await repository.findDocument({
        organizationId,
        documentId,
      });
      if (!document) throw notFoundError();
      try {
        const url = await storage.createSignedGetUrl({
          objectKey: document.objectKey,
          expiresIn: DOCUMENT_ACCESS_TTL_SECONDS,
        });
        return {
          url,
          expiresAt: new Date(
            clock().getTime() + DOCUMENT_ACCESS_TTL_SECONDS * 1000,
          ),
          fileName: document.originalFilename,
          contentType: document.mimeType,
        };
      } catch (error) {
        if (error instanceof StorageProviderError) {
          throw applicationStorageUnavailableError();
        }
        throw error;
      }
    },
  };
}
