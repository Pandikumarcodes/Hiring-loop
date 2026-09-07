import type { RefCallback } from 'react'
import { Field, Input, Select, Textarea } from '../../../shared/components/ui'
import type { PublicApplicationQuestionDto } from '../../public-careers/types/public-career.types'
import { questionTypeLabel } from '../utils/application-utils'

const choiceClass =
  'h-5 w-5 shrink-0 accent-primary focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2'

interface ApplicationQuestionFieldProps {
  question: PublicApplicationQuestionDto
  value: unknown
  error?: string
  disabled?: boolean
  inputRef?: RefCallback<HTMLElement>
  onChange: (value: unknown) => void
}

export function ApplicationQuestionField({
  question,
  value,
  error,
  disabled = false,
  inputRef,
  onChange,
}: ApplicationQuestionFieldProps) {
  const id = `question-${question.id}`
  const errorId = error ? `${id}-error` : undefined
  const descriptionId = question.description ? `${id}-description` : undefined
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  if (question.type === 'MULTI_SELECT') {
    const selected = Array.isArray(value) ? value.map(String) : []
    return (
      <fieldset className="grid min-w-0 gap-3" aria-describedby={describedBy}>
        <legend className="text-sm font-semibold text-text-primary">
          {question.label}
          {question.required ? <span aria-hidden="true"> *</span> : null}
        </legend>
        <p className="text-xs text-text-secondary">
          {questionTypeLabel(question.type)}
        </p>
        {question.description ? (
          <p id={descriptionId} className="text-sm text-text-secondary">
            {question.description}
          </p>
        ) : null}
        <div className="grid gap-3">
          {question.options.map((option) => {
            const optionId = `${id}-${option.id}`
            return (
              <label
                key={option.id}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  ref={option === question.options[0] ? inputRef : undefined}
                  className={choiceClass}
                  type="checkbox"
                  id={optionId}
                  name={id}
                  value={option.id}
                  checked={selected.includes(option.id)}
                  disabled={disabled}
                  aria-invalid={Boolean(error)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, option.id]
                        : selected.filter((item) => item !== option.id),
                    )
                  }
                />
                <span className="break-words">{option.label}</span>
              </label>
            )
          })}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </fieldset>
    )
  }

  if (question.type === 'YES_NO') {
    return (
      <fieldset className="grid min-w-0 gap-3" aria-describedby={describedBy}>
        <legend className="text-sm font-semibold text-text-primary">
          {question.label}
          {question.required ? <span aria-hidden="true"> *</span> : null}
        </legend>
        <p className="text-xs text-text-secondary">
          {questionTypeLabel(question.type)}
        </p>
        {question.description ? (
          <p id={descriptionId} className="text-sm text-text-secondary">
            {question.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-4">
          {[
            ['yes', true, 'Yes'],
            ['no', false, 'No'],
          ].map(([suffix, optionValue, label]) => {
            const optionId = `${id}-${suffix}`
            return (
              <label
                key={optionId}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  ref={suffix === 'yes' ? inputRef : undefined}
                  className={choiceClass}
                  type="radio"
                  id={optionId}
                  name={id}
                  checked={value === optionValue}
                  disabled={disabled}
                  aria-invalid={Boolean(error)}
                  onChange={() => onChange(optionValue)}
                />
                {label}
              </label>
            )
          })}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </fieldset>
    )
  }

  if (question.type === 'SINGLE_SELECT')
    return (
      <Field
        error={error}
        id={id}
        label={question.label}
        required={question.required}
        helperText={question.description ?? undefined}
      >
        {({ describedBy: fieldDescribedBy, invalid }) => (
          <Select
            ref={inputRef}
            id={id}
            name={id}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            aria-describedby={fieldDescribedBy}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value || undefined)}
          >
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    )

  const inputType =
    question.type === 'NUMBER'
      ? 'number'
      : question.type === 'DATE'
        ? 'date'
        : question.type === 'URL'
          ? 'url'
          : 'text'
  const inputValue = value === undefined || value === null ? '' : String(value)
  return (
    <Field
      error={error}
      id={id}
      label={question.label}
      required={question.required}
      helperText={question.description ?? undefined}
    >
      {({ describedBy: fieldDescribedBy, invalid }) => {
        const shared = {
          id,
          name: id,
          value: inputValue,
          placeholder: question.placeholder ?? undefined,
          disabled,
          required: question.required,
          'aria-describedby': fieldDescribedBy,
          'aria-invalid': invalid,
        }
        return question.type === 'LONG_TEXT' ? (
          <Textarea
            {...shared}
            ref={inputRef}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Input
            {...shared}
            ref={inputRef}
            type={inputType}
            onChange={(event) => onChange(event.target.value)}
          />
        )
      }}
    </Field>
  )
}
