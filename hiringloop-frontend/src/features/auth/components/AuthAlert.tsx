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
      className={`auth-alert auth-alert--${tone}`}
      role={isLiveStatus ? 'status' : 'alert'}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  )
}
