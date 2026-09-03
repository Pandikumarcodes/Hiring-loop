import { useState } from 'react'

import { Field, Input } from '../../../components/ui'

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
        <div className="auth-password-field">
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
            className="auth-password-field__toggle"
            disabled={disabled}
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        </div>
      )}
    </Field>
  )
}
