import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Link,
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { authKeys } from '../../features/auth/hooks/query-keys'
import { expireAuthenticatedSession } from '../../features/auth/hooks/session-expiry'
import { createAppQueryClient } from '../providers/query-client'
import { lazyRoute } from './LazyRoute'
import { ProtectedRoute } from './ProtectedRoute'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function deferredPage() {
  let resolve!: (module: { default: typeof Workspace }) => void
  let reject!: (reason: Error) => void
  const load = vi.fn(
    () =>
      new Promise<{ default: typeof Workspace }>((yes, no) => {
        resolve = yes
        reject = no
      }),
  )
  return {
    load,
    Page: lazyRoute(load),
    resolve: () => resolve({ default: Workspace }),
    reject: () =>
      reject(
        new Error('Failed to fetch dynamically imported module: private-url'),
      ),
  }
}

function Workspace() {
  const { organizationId } = useParams()
  return <h1>Workspace {organizationId}</h1>
}

function Shell() {
  const navigate = useNavigate()
  return (
    <>
      <nav aria-label="Test shell">
        <Link to="/app/one">One</Link>
        <Link to="/app/two">Two</Link>
        <Link to="/other">Other</Link>
        <button onClick={() => navigate(-1)}>Back</button>
        <button onClick={() => navigate(1)}>Forward</button>
      </nav>
      <Outlet />
    </>
  )
}

function setup(page: ReturnType<typeof deferredPage>, authenticated = true) {
  const client = createAppQueryClient()
  client.setQueryData(
    authKeys.currentUser(),
    authenticated
      ? {
          id: 'user-1',
          email: 'person@example.test',
          emailVerified: true,
        }
      : null,
  )
  const Page = page.Page
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/one']}>
        <Routes>
          <Route path="login" element={<h1>Login</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Shell />}>
              <Route path="app/:organizationId" element={<Page />} />
              <Route path="other" element={<h1>Other page</h1>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

test('shows one accessible page fallback inside the shell and caches the module on return', async () => {
  const page = deferredPage()
  const client = setup(page)
  client.setQueryData(['sentinel'], 'cached')
  expect(screen.getByRole('status', { name: 'Loading page' })).toBeVisible()
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('navigation', { name: 'Test shell' })).toBeVisible()
  await act(page.resolve)
  expect(
    await screen.findByRole('heading', { name: 'Workspace one' }),
  ).toBeVisible()
  const user = userEvent.setup()
  await user.click(screen.getByRole('link', { name: 'Other' }))
  await user.click(screen.getByRole('link', { name: 'One' }))
  expect(screen.getByRole('heading', { name: 'Workspace one' })).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(page.load).toHaveBeenCalledTimes(1)
  expect(client.getQueryData(['sentinel'])).toBe('cached')
})

test('keeps organization params correct when switching workspace and going back/forward', async () => {
  const page = deferredPage()
  setup(page)
  await act(page.resolve)
  await screen.findByRole('heading', { name: 'Workspace one' })
  const user = userEvent.setup()
  await user.click(screen.getByRole('link', { name: 'Two' }))
  expect(screen.getByRole('heading', { name: 'Workspace two' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Workspace one' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Forward' }))
  expect(screen.getByRole('heading', { name: 'Workspace two' })).toBeVisible()
  expect(page.load).toHaveBeenCalledTimes(1)
})

test('does not import a protected page for an unauthenticated deep link', async () => {
  const page = deferredPage()
  setup(page, false)
  expect(await screen.findByRole('heading', { name: 'Login' })).toBeVisible()
  expect(page.load).not.toHaveBeenCalled()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('session expiry removes a pending route and resolving its chunk cannot reveal content', async () => {
  const page = deferredPage()
  const client = setup(page)
  await act(() => expireAuthenticatedSession(client))
  expect(await screen.findByRole('heading', { name: 'Login' })).toBeVisible()
  await act(page.resolve)
  expect(
    screen.queryByRole('heading', { name: 'Workspace one' }),
  ).not.toBeInTheDocument()
})

test('chunk failure preserves session and shell, supports navigation, and never retries automatically', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const page = deferredPage()
  const client = setup(page)
  await act(page.reject)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load this page',
  )
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible()
  expect(screen.queryByText(/private-url/)).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(client.getQueryData(authKeys.currentUser())).toMatchObject({
    id: 'user-1',
  })
  const user = userEvent.setup()
  await user.click(screen.getByRole('link', { name: 'Other' }))
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Other page' })).toBeVisible(),
  )
  expect(page.load).toHaveBeenCalledTimes(1)
})
