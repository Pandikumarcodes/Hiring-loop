import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '../../shared/components/ui'

interface AppErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error reporting is intentionally deferred until an approved observability boundary exists.
  }

  handleRetry = () => {
    this.setState({ hasError: false })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="status-page" role="alert">
        <p className="eyebrow">Unexpected application error</p>
        <h1>Something went wrong</h1>
        <p>
          The application could not render this page. Try again, or reload the
          application if the problem continues.
        </p>
        <Button type="button" onClick={this.handleRetry}>
          Try again
        </Button>
      </main>
    )
  }
}
