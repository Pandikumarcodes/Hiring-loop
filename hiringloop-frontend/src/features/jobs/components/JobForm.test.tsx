import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { JobForm } from './JobForm'
import type { JobInput } from '../types/job.types'

afterEach(cleanup)

test('aligned job fields retain their native values and full submit payload', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  function Form() {
    const [value, setValue] = useState<JobInput>({
      title: '',
      department: null,
      location: null,
      description: null,
      openings: 1,
    })
    return (
      <JobForm
        value={value}
        errors={{}}
        busy={false}
        submitLabel="Save draft"
        onChange={setValue}
        onSubmit={() => save(value)}
        onCancel={vi.fn()}
      />
    )
  }
  render(<Form />)
  await user.type(screen.getByLabelText('Job title'), 'Platform engineer')
  await user.type(screen.getByLabelText('Department'), 'Engineering')
  await user.clear(screen.getByLabelText(/Number of openings/))
  await user.type(screen.getByLabelText(/Number of openings/), '2')
  await user.selectOptions(
    screen.getByLabelText('Employment type'),
    'FULL_TIME',
  )
  await user.selectOptions(screen.getByLabelText('Workplace type'), 'HYBRID')
  expect(screen.getByLabelText('Location')).toHaveAccessibleDescription(
    'Required before this job can be opened.',
  )
  await user.type(screen.getByLabelText('Location'), 'Chennai')
  await user.type(screen.getByLabelText('Description'), 'Build hiring tools.')
  await user.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(save).toHaveBeenCalledExactlyOnceWith({
    title: 'Platform engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    location: 'Chennai',
    description: 'Build hiring tools.',
    openings: 2,
  })
})

test('helper and error associations survive rendering a pending form', async () => {
  const submit = vi.fn()
  render(
    <JobForm
      value={{ title: 'Draft role', openings: 1 }}
      errors={{ title: 'Enter a title.' }}
      busy
      submitLabel="Save draft"
      secondaryLabel="Save & open"
      onChange={vi.fn()}
      onSubmit={submit}
      onSecondary={vi.fn()}
      onCancel={vi.fn()}
    />,
  )
  const title = screen.getByLabelText('Job title')
  expect(title).toHaveAttribute('aria-invalid', 'true')
  expect(title).toHaveAccessibleDescription(
    'Required before opening; optional for a draft. Enter a title.',
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a title.')
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Save & open' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(submit).not.toHaveBeenCalled()
})
