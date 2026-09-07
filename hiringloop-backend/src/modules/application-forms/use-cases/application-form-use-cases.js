import { Prisma } from '@prisma/client';
import {
  applicationFormDraftNotFoundError,
  applicationFormInvalidOrderError,
  applicationFormNotFoundError,
  applicationFormQuestionNotFoundError,
  applicationFormQuestionLimitError,
  formVersionConflictError,
} from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import { toApplicationFormBuilderDto } from '../domain/application-form-dto.js';

const MAX_QUESTIONS = 100;
const choice = (type) => ['SINGLE_SELECT', 'MULTI_SELECT'].includes(type);
function result(value) {
  if (value.outcome === 'not_found') throw applicationFormNotFoundError();
  if (value.outcome === 'no_draft') throw applicationFormDraftNotFoundError();
  if (value.outcome === 'conflict') throw formVersionConflictError();
  return toApplicationFormBuilderDto(value.form);
}
function draftQuestion(draft, id) {
  const found = draft.questions.find((item) => item.id === id);
  if (!found) throw applicationFormQuestionNotFoundError();
  return found;
}
export function createApplicationFormUseCases({
  applicationFormRepository,
  clock = () => new Date(),
}) {
  const get = async (input) => {
    const form = await applicationFormRepository.find(input);
    if (
      !form ||
      !form.activeVersion ||
      form.activeVersion.applicationFormId !== form.id ||
      form.activeVersion.organizationId !== form.organizationId ||
      form.activeVersion.status !== 'PUBLISHED'
    )
      throw applicationFormNotFoundError();
    return toApplicationFormBuilderDto(form);
  };
  const mutation = (input, apply) =>
    applicationFormRepository.mutate(input, apply).then(result);
  return {
    get,
    async createDraft(input) {
      try {
        const form = await applicationFormRepository.createDraft({
          ...input,
          id: generateEntityId,
        });
        if (!form || form.invalid) throw applicationFormNotFoundError();
        return toApplicationFormBuilderDto(form);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const form = await applicationFormRepository.find(input);
          if (form?.versions[0]) return toApplicationFormBuilderDto(form);
        }
        throw error;
      }
    },
    addQuestion: (input) =>
      mutation(input, async (tx, _form, draft) => {
        if (draft.questions.length >= MAX_QUESTIONS)
          throw applicationFormQuestionLimitError();
        await tx.applicationFormQuestion.create({
          data: {
            id: generateEntityId(),
            organizationId: input.organizationId,
            applicationFormVersionId: draft.id,
            questionKey: generateEntityId(),
            type: input.type,
            label: input.label,
            description: input.description ?? null,
            placeholder: input.placeholder ?? null,
            required: input.required,
            sortOrder: (draft.questions.at(-1)?.sortOrder ?? 0) + 1000,
            options: choice(input.type)
              ? {
                  create: input.options.map((item, index) => ({
                    id: generateEntityId(),
                    organizationId: input.organizationId,
                    label: item.label,
                    value: item.value,
                    sortOrder: (index + 1) * 1000,
                  })),
                }
              : undefined,
          },
        });
      }),
    updateQuestion: (input) =>
      mutation(input, async (tx, _form, draft) => {
        const current = draftQuestion(draft, input.questionId);
        if (!choice(input.type))
          await tx.applicationFormQuestionOption.deleteMany({
            where: {
              questionId: current.id,
              organizationId: input.organizationId,
            },
          });
        await tx.applicationFormQuestion.update({
          where: { id: current.id },
          data: {
            type: input.type,
            label: input.label,
            description: input.description ?? null,
            placeholder: input.placeholder ?? null,
            required: input.required,
          },
        });
        if (choice(input.type)) {
          await tx.applicationFormQuestionOption.deleteMany({
            where: { questionId: current.id },
          });
          await tx.applicationFormQuestionOption.createMany({
            data: input.options.map((item, index) => ({
              id: generateEntityId(),
              organizationId: input.organizationId,
              questionId: current.id,
              label: item.label,
              value: item.value,
              sortOrder: (index + 1) * 1000,
            })),
          });
        }
      }),
    deleteQuestion: (input) =>
      mutation(input, async (tx, _form, draft) => {
        const current = draftQuestion(draft, input.questionId);
        await tx.applicationFormQuestionOption.deleteMany({
          where: { questionId: current.id },
        });
        await tx.applicationFormQuestion.delete({ where: { id: current.id } });
      }),
    reorderQuestions: (input) =>
      mutation(input, async (tx, _form, draft) => {
        const ids = draft.questions.map((q) => q.id);
        if (
          new Set(input.questionIds).size !== ids.length ||
          input.questionIds.length !== ids.length ||
          input.questionIds.some((id) => !ids.includes(id))
        )
          throw applicationFormInvalidOrderError();
        await Promise.all(
          input.questionIds.map((id, index) =>
            tx.applicationFormQuestion.update({
              where: { id },
              data: { sortOrder: (index + 1) * 1000 },
            }),
          ),
        );
      }),
    publish: (input) =>
      mutation(input, async (tx, form, draft) => {
        await tx.applicationFormVersion.update({
          where: { id: draft.id },
          data: { status: 'PUBLISHED', publishedAt: clock() },
        });
        await tx.applicationForm.update({
          where: { id: form.id },
          data: { activeVersionId: draft.id },
        });
      }),
    discard: (input) =>
      mutation(input, async (tx, _form, draft) => {
        await tx.applicationFormQuestionOption.deleteMany({
          where: { question: { applicationFormVersionId: draft.id } },
        });
        await tx.applicationFormQuestion.deleteMany({
          where: { applicationFormVersionId: draft.id },
        });
        await tx.applicationFormVersion.delete({ where: { id: draft.id } });
      }),
  };
}
