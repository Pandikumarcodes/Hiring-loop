import type { ReactNode } from 'react'

type AuthAlertTone = 'error' | 'info' | 'success' | 'warning'

interface AuthAlertProps {
  children: ReactNode
  title?: string
  tone?: AuthAlertTone
}

export function AuthAlert({ children, title, tone = 'error' }: AuthAlertProps) {
  const isLiveStatus = tone === 'success' || tone === 'info'

  return (
    <div
      className={`my-5 grid min-w-0 gap-1.5 break-words rounded-control border px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere] [&_strong]:block [&_strong]:font-semibold ${
        tone === 'error'
          ? 'border-error-border bg-error-soft text-error'
          : tone === 'warning'
            ? 'border-warning-border bg-warning-soft text-warning'
            : tone === 'success'
              ? 'border-success-border bg-success-soft text-success'
              : 'border-info-border bg-info-soft text-info'
      }`}
      role={isLiveStatus ? 'status' : 'alert'}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  )
}
