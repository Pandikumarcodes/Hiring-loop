import './App.css'

import { AppErrorBoundary } from './app/AppErrorBoundary'
import { AppProviders } from './app/AppProviders'
import { AppRoutes } from './app/routes'

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
