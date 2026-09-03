import { useId, type ReactNode } from 'react'

import { LoadingIndicator } from './LoadingIndicator'

interface LoadingStateProps {
  description?: ReactNode
  label?: string
  contained?: boolean
}

/** Product-agnostic initial loading presentation for a region or page. */
export function LoadingState({
  contained = true,
  description,
  label = 'Loading',
}: LoadingStateProps) {
  const titleId = useId()

  return (
    <section
      className={`feedback-state feedback-loading-state${contained ? '' : ' feedback-loading-state--page'}`}
      aria-labelledby={titleId}
      aria-busy="true"
    >
      <h2 id={titleId}>{label}</h2>
      {description ? <p>{description}</p> : null}
      <LoadingIndicator label={label} block />
    </section>
  )
}
