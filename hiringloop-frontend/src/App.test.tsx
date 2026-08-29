import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'

import App from './App'

test('renders the HiringLoop shell', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'HiringLoop' })).toBeVisible()
})
