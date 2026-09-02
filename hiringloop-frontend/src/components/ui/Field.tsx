import type { ReactNode } from 'react'

export interface FieldDescriptionProps {
  describedBy: string | undefined
  invalid: boolean
}

interface FieldProps {
  children: (descriptionProps: FieldDescriptionProps) => ReactNode
  error?: string
  helperText?: string
  id: string
  label: string
  required?: boolean
}

export function Field({
  children,
  error,
  helperText,
  id,
  label,
  required = false,
}: FieldProps) {
  const helperId = helperText ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({ describedBy, invalid: Boolean(error) })}
      {helperText ? (
        <p className="ui-field__hint" id={helperId}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p className="ui-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
