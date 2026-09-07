import { describe, expect, test } from 'vitest'
import {
  answerForSubmission,
  candidateApplicationSchema,
  MAX_RESUME_BYTES,
  validateApplication,
  validateResume,
} from './application-utils'

const questions = [
  {
    id: 'short',
    type: 'SHORT_TEXT',
    label: 'Short',
    description: null,
    placeholder: null,
    required: true,
    options: [],
  },
  {
    id: 'number',
    type: 'NUMBER',
    label: 'Number',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'yes',
    type: 'YES_NO',
    label: 'Yes',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'single',
    type: 'SINGLE_SELECT',
    label: 'Single',
    description: null,
    placeholder: null,
    required: false,
    options: [{ id: 'opt-1', label: 'Option', value: 'option' }],
  },
  {
    id: 'multi',
    type: 'MULTI_SELECT',
    label: 'Multi',
    description: null,
    placeholder: null,
    required: false,
    options: [{ id: 'opt-1', label: 'Option', value: 'option' }],
  },
  {
    id: 'date',
    type: 'DATE',
    label: 'Date',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
  {
    id: 'url',
    type: 'URL',
    label: 'URL',
    description: null,
    placeholder: null,
    required: false,
    options: [],
  },
] as const

describe('candidate application validation and answer mapping', () => {
  test('uses the generated Zod schema for invalid email and required dynamic answers', () => {
    const result = candidateApplicationSchema(questions).safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
      phone: '',
      resume: new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }),
      answers: {},
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['email'],
          message: 'Enter a valid email address.',
        }),
        expect.objectContaining({
          path: ['answers', 'short'],
          message: 'This question is required.',
        }),
      ]),
    )
  })

  test('requires core data, resume and required custom questions', () => {
    const errors = validateApplication(
      '',
      '',
      'bad',
      'x'.repeat(51),
      null,
      questions,
      {},
    )
    expect(errors.firstName).toBeTruthy()
    expect(errors.lastName).toBeTruthy()
    expect(errors.email).toBeTruthy()
    expect(errors.phone).toBeTruthy()
    expect(errors.resume).toBeTruthy()
    expect(errors['question-short']).toBe('This question is required.')
  })

  test('transforms every backend answer shape and omits empty optional answers', () => {
    expect(
      answerForSubmission(questions, {
        short: ' Hello ',
        number: '12',
        yes: false,
        single: 'opt-1',
        multi: ['opt-1'],
        date: '2026-09-07',
        url: 'https://example.test',
      }),
    ).toEqual([
      { questionId: 'short', value: 'Hello' },
      { questionId: 'number', value: 12 },
      { questionId: 'yes', value: false },
      { questionId: 'single', value: { optionId: 'opt-1' } },
      { questionId: 'multi', value: { optionIds: ['opt-1'] } },
      { questionId: 'date', value: '2026-09-07' },
      { questionId: 'url', value: 'https://example.test' },
    ])
  })

  test('accepts supported resume types and rejects unsupported or oversized files', () => {
    expect(
      validateResume(
        new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }),
      ),
    ).toBeUndefined()
    expect(
      validateResume(
        new File(['doc'], 'resume.doc', { type: 'application/msword' }),
      ),
    ).toBeUndefined()
    expect(
      validateResume(
        new File(['docx'], 'resume.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).toBeUndefined()
    expect(
      validateResume(new File(['txt'], 'resume.txt', { type: 'text/plain' })),
    ).toContain('PDF')
    expect(
      validateResume(
        new File([new Uint8Array(MAX_RESUME_BYTES + 1)], 'resume.pdf', {
          type: 'application/pdf',
        }),
      ),
    ).toContain('5 MB')
  })
})
