import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AppErrorBoundary } from './AppErrorBoundary'
import { AppRoutes } from './routes'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderRoutes(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  test('renders the neutral foundation route with a main landmark', () => {
    renderRoutes()

    expect(
      screen.getByRole('heading', { name: 'HiringLoop frontend foundation' }),
    ).toBeVisible()
    expect(screen.getByRole('main')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content')
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  test('composes the application layout around its child route', () => {
    renderRoutes('/app')

    expect(
      screen.getByRole('heading', { name: 'Neutral application layout' }),
    ).toBeVisible()
    expect(
      screen.getByRole('navigation', { name: 'Application shell navigation' }),
    ).toBeVisible()
  })

  test('renders an accessible not-found experience for unknown routes', () => {
    renderRoutes('/does-not-exist')

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Return to foundation home' }),
    ).toBeVisible()
  })

  test('recovers from not-found navigation through the foundation link', async () => {
    const user = userEvent.setup()
    renderRoutes('/missing')

    await user.click(
      screen.getByRole('link', { name: 'Return to foundation home' }),
    )

    expect(
      screen.getByRole('heading', { name: 'HiringLoop frontend foundation' }),
    ).toBeVisible()
  })
})

describe('AppErrorBoundary', () => {
  test('shows safe fallback UI and supports retry recovery', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let shouldThrow = true

    function ThrowingChild() {
      if (shouldThrow) {
        throw new Error('private implementation detail')
      }

      return <p>Recovered content</p>
    }

    const { rerender } = render(
      <AppErrorBoundary
        onReset={() => {
          shouldThrow = false
        }}
      >
        <ThrowingChild />
      </AppErrorBoundary>,
    )

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeVisible()
    expect(
      screen.queryByText('private implementation detail'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    rerender(
      <AppErrorBoundary
        onReset={() => {
          shouldThrow = false
        }}
      >
        <ThrowingChild />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Recovered content')).toBeVisible()
  })
})
