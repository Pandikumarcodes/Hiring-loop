import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import { createAppQueryClient } from '../providers/query-client'
import { authKeys } from '../../features/auth/hooks/query-keys'
import { expireAuthenticatedSession } from '../../features/auth/hooks/session-expiry'
import { ProtectedRoute } from './ProtectedRoute'

const user = {
  id: 'user-1',
  email: 'person@example.test',
  emailVerified: true,
}

function LoginLocation() {
  const location = useLocation()
  return <p>{`Login at ${location.pathname}`}</p>
}

describe('ProtectedRoute session expiry', () => {
  test('stops rendering protected content and redirects to login after expiry', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/app/organizations/organization-a/jobs']}
        >
          <Routes>
            <Route path="/login" element={<LoginLocation />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/app/*"
                element={<p>Protected workspace content</p>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Protected workspace content')).toBeVisible()

    await act(() => expireAuthenticatedSession(queryClient))

    await waitFor(() =>
      expect(screen.getByText('Login at /login')).toBeVisible(),
    )
    expect(
      screen.queryByText('Protected workspace content'),
    ).not.toBeInTheDocument()
  })
})
