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
      className={`rounded-control border px-4 py-3 text-sm leading-6 [&_strong]:mb-1 [&_strong]:block ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : tone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-teal-200 bg-primary-soft text-teal-900'
      }`}
      role={isLiveStatus ? 'status' : 'alert'}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  )
}
