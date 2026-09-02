import { useId, type ReactNode } from 'react'

interface NoResultsStateProps {
  action?: ReactNode
  description?: ReactNode
  title: string
}

/** Use when a resource exists but active search or filters match nothing. */
export function NoResultsState({
  action,
  description,
  title,
}: NoResultsStateProps) {
  const titleId = useId()

  return (
    <section className="feedback-state" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="feedback-state__action">{action}</div> : null}
    </section>
  )
}
