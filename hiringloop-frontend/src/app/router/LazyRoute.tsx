import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../shared/components/feedback'
import { Button } from '../../shared/components/ui'

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <ErrorState
        title="Unable to load this page"
        description="Please check your connection and reload the page. You can also choose another page from the navigation."
        action={
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        }
      />
    )
  }
}

/** Declare at module scope so React caches the import across route visits. */
export function lazyRoute<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
) {
  const Page = lazy(load)

  return function LazyRoute(props: Props) {
    const { pathname } = useLocation()

    return (
      <RouteErrorBoundary key={pathname}>
        <Suspense fallback={<LoadingState label="Loading page" />}>
          <Page {...props} />
        </Suspense>
      </RouteErrorBoundary>
    )
  }
}
