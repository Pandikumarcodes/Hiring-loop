import './styles/App.css'

import { AppErrorBoundary } from './app/error/AppErrorBoundary'
import { AppProviders } from './app/providers/AppProviders'
import { AppRoutes } from './app/router/routes'

function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppRoutes />
      </AppErrorBoundary>
    </AppProviders>
  )
}

export default App
