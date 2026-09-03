import { useId, type ReactNode } from 'react'

interface EmptyStateProps {
  action?: ReactNode
  description?: ReactNode
  title: string
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  const titleId = useId()

  return (
    <section className="feedback-state" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="feedback-state__action">{action}</div> : null}
    </section>
  )
}
