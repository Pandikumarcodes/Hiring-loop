import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './layouts/AppLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { FoundationPage } from './pages/FoundationPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<FoundationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="app" element={<AppLayout />}>
        <Route index element={<FoundationPage context="application" />} />
      </Route>
    </Routes>
  )
}
