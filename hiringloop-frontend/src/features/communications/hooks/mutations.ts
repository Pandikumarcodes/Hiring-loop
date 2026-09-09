import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  createTemplate,
  deleteTemplate,
  sendCommunication,
  updateTemplate,
} from '../api/communications.api'
import { communicationKeys } from './query-keys'
import type { TemplateInput } from '../types/communications.types'
export function useSendCommunication(
  organizationId: string,
  applicationId: string,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      subject: string
      body: string
      idempotencyKey: string
    }) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        sendCommunication(organizationId, applicationId, input, csrf),
      ),
    onSettled: () =>
      client.invalidateQueries({
        queryKey: ['communications', organizationId, applicationId],
      }),
  })
}
export function useTemplateMutations(organizationId: string) {
  const client = useQueryClient()
  const invalidate = () =>
    client.invalidateQueries({
      queryKey: communicationKeys.templates(organizationId),
    })
  const create = useMutation({
    mutationFn: (input: TemplateInput) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        createTemplate(organizationId, input, csrf),
      ),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: (input: TemplateInput & { id: string }) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        updateTemplate(organizationId, input.id, input, csrf),
      ),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        deleteTemplate(organizationId, id, csrf),
      ),
    onSuccess: invalidate,
  })
  return { create, update, remove }
}
