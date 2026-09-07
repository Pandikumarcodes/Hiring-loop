import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import { accessCandidateDocument } from '../api/candidate-management.api'

export function useDocumentAccess(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      runAuthenticatedAuthMutation(queryClient, (csrfToken) =>
        accessCandidateDocument(organizationId, documentId, csrfToken),
      ),
  })
}
