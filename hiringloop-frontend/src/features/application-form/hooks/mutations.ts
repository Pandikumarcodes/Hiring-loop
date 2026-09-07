import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import * as api from '../api/application-form.api'
import type {
  ApplicationFormBuilderDto,
  QuestionInput,
} from '../types/application-form.types'
import { applicationFormKeys } from './query-keys'
function useFormMutation<T>(
  org: string,
  job: string,
  action: (input: T, csrf: string) => Promise<ApplicationFormBuilderDto>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: T) =>
      runAuthenticatedAuthMutation(client, (csrf) => action(input, csrf)),
    onSuccess: (data) =>
      client.setQueryData(applicationFormKeys.builder(org, job), data),
    onError: (error) => {
      if ((error as { code?: string }).code === 'FORM_VERSION_CONFLICT')
        return client.invalidateQueries({
          queryKey: applicationFormKeys.builder(org, job),
          exact: true,
        })
    },
  })
}
export const useCreateDraft = (o: string, j: string) =>
  useFormMutation(o, j, (_, csrf) => api.createDraft(o, j, csrf))
export const useAddQuestion = (o: string, j: string) =>
  useFormMutation<QuestionInput>(o, j, (v, csrf) =>
    api.addQuestion(o, j, v, csrf),
  )
export const useUpdateQuestion = (o: string, j: string) =>
  useFormMutation<{ questionId: string; input: QuestionInput }>(
    o,
    j,
    (v, csrf) => api.updateQuestion(o, j, v.questionId, v.input, csrf),
  )
export const useDeleteQuestion = (o: string, j: string) =>
  useFormMutation<{ questionId: string; expectedRevision: number }>(
    o,
    j,
    (v, csrf) =>
      api.deleteQuestion(o, j, v.questionId, v.expectedRevision, csrf),
  )
export const useReorderQuestions = (o: string, j: string) =>
  useFormMutation<{ questionIds: readonly string[]; expectedRevision: number }>(
    o,
    j,
    (v, csrf) =>
      api.reorderQuestions(o, j, v.questionIds, v.expectedRevision, csrf),
  )
export const usePublishDraft = (o: string, j: string) =>
  useFormMutation<{ expectedRevision: number }>(o, j, (v, csrf) =>
    api.publishDraft(o, j, v.expectedRevision, csrf),
  )
export const useDiscardDraft = (o: string, j: string) =>
  useFormMutation<{ expectedRevision: number }>(o, j, (v, csrf) =>
    api.discardDraft(o, j, v.expectedRevision, csrf),
  )
