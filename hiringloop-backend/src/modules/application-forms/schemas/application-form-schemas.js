import { z } from 'zod';

const types = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'YES_NO',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'DATE',
  'URL',
];
const text = z.string().trim().min(1).max(500);
const nullableText = z.string().trim().max(500).nullable().optional();
const option = z
  .object({ label: text, value: z.string().trim().min(1).max(200) })
  .strict();
const revision = z.number().int().min(1);
const configuration = z
  .object({
    type: z.enum(types),
    label: text,
    description: nullableText,
    placeholder: nullableText,
    required: z.boolean(),
    options: z.array(option).min(2).max(50).optional(),
  })
  .strict();

function optionRules(value, context) {
  const choice = ['SINGLE_SELECT', 'MULTI_SELECT'].includes(value.type);
  if (choice && !value.options)
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Choice questions require at least two options',
    });
  if (!choice && value.options)
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are allowed only for choice questions',
    });
  if (
    value.options &&
    new Set(value.options.map((item) => item.value)).size !==
      value.options.length
  )
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Option values must be unique',
    });
}
export const formParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const questionParamsSchema = formParamsSchema.extend({
  questionId: z.uuid(),
});
export const emptyBodySchema = z.object({}).strict();
export const createQuestionBodySchema = configuration
  .extend({ expectedRevision: revision })
  .superRefine(optionRules);
export const updateQuestionBodySchema = configuration
  .extend({ expectedRevision: revision })
  .superRefine(optionRules);
export const revisionBodySchema = z
  .object({ expectedRevision: revision })
  .strict();
export const reorderQuestionsBodySchema = z
  .object({
    expectedRevision: revision,
    questionIds: z.array(z.uuid()).max(100),
  })
  .strict();
