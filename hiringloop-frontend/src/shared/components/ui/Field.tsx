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
    <div className="ui-field grid min-w-0 gap-2">
      <Label className="text-sm font-semibold" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children({ describedBy, invalid: Boolean(error) })}
      {helperText ? (
        <p className="text-sm text-text-secondary" id={helperId}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
