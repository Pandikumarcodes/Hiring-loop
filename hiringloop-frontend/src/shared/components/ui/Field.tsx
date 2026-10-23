import type { ReactNode } from 'react'
import { Label } from './Label'

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
    <div className="ui-field flex min-w-0 flex-col items-stretch gap-1.5 self-start">
      <Label className="text-sm font-medium leading-5" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children({ describedBy, invalid: Boolean(error) })}
      {helperText ? (
        <p
          className="text-xs leading-5 text-text-secondary [overflow-wrap:anywhere]"
          id={helperId}
        >
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-xs leading-5 text-error [overflow-wrap:anywhere]"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
