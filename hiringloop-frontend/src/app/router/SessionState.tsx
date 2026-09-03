import { useId } from 'react'

import { ErrorState, LoadingIndicator } from '../../components/feedback'

export function SessionBootstrapLoading() {
  const titleId = useId()

  return (
    <main className="session-state" aria-labelledby={titleId}>
      <section className="session-state__card" aria-busy="true">
        <h1 id={titleId}>Checking your session</h1>
        <p role="status">Verifying your HiringLoop session…</p>
        <LoadingIndicator label="Checking your session" block />
      </section>
    </main>
  )
}

interface SessionBootstrapErrorProps {
  onRetry: () => void
}

export function SessionBootstrapError({ onRetry }: SessionBootstrapErrorProps) {
  return (
    <main className="session-state">
      <ErrorState
        description="We couldn't connect to HiringLoop. Please try again."
        onRetry={onRetry}
        title="Unable to verify your session"
      />
    </main>
  )
}
