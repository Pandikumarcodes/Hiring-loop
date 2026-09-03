import { useId, type ReactNode } from 'react'

interface ErrorStateProps {
  action?: ReactNode
  description?: ReactNode
  title?: string
  onRetry?: () => void
  requestId?: string
}

export function ErrorState({
  action,
  description = 'We could not complete this request. Please try again.',
  onRetry,
  requestId,
  title = 'Something went wrong',
}: ErrorStateProps) {
  const titleId = useId()

  return (
    <section
      className="feedback-state feedback-state--error"
      role="alert"
      aria-labelledby={titleId}
    >
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {requestId ? (
        <p className="feedback-state__reference">Reference ID: {requestId}</p>
      ) : null}
      {onRetry ? (
        <div className="feedback-state__action">
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
      {action ? <div className="feedback-state__action">{action}</div> : null}
    </section>
  )
}
