import { useState } from 'react'

import { Field, Input } from '../../../shared/components/ui'

interface PasswordFieldProps {
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
  error?: string
  helperText?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}

export function PasswordField({
  autoComplete,
  disabled,
  error,
  helperText,
  id,
  label,
  onChange,
  value,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field error={error} helperText={helperText} id={id} label={label} required>
      {({ describedBy, invalid }) => (
        <div className="relative min-w-0">
          <Input
            aria-describedby={describedBy}
            aria-invalid={invalid}
            autoComplete={autoComplete}
            disabled={disabled}
            id={id}
            maxLength={128}
            minLength={autoComplete === 'new-password' ? 12 : undefined}
            name={id}
            onChange={(event) => onChange(event.target.value)}
            required
            type={visible ? 'text' : 'password'}
            value={value}
          />
          <button
            aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            className="absolute right-0.5 top-0 flex h-11 w-10 items-center justify-center rounded-control text-text-secondary hover:text-text-primary focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        </div>
      )}
    </Field>
  )
}
