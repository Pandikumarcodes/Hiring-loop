import { useState, type FormEvent } from 'react'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoResultsState,
} from './feedback'
import { Button, Field, Input } from './ui'

describe('form and async-state foundation', () => {
  test('loading is announced and empty/no-results have distinct intent', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(
      <>
        <LoadingState label="Loading records" description="Please wait." />
        <EmptyState title="No records yet" />
        <NoResultsState
          title="No records match"
          description="Try clearing a filter."
          action={<Button onClick={onClear}>Clear filters</Button>}
        />
      </>,
    )

    expect(
      screen.getByRole('heading', { name: 'Loading records' }),
    ).toBeVisible()
    expect(
      screen.getByRole('status', { name: 'Loading records' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'No records yet' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'No records match' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  test('error presentation supports safe retry and optional reference ID', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ErrorState
        title="Unable to load records"
        description="Please try again."
        requestId="req-123"
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Reference ID: req-123')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  test('native controls provide accessible field errors and local submit state', async () => {
    const user = userEvent.setup()
    let finishSubmit = () => {}
    const onSubmit = vi.fn(
      (submittedValue: string) =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
          void submittedValue
        }),
    )

    function GenericForm() {
      const [value, setValue] = useState('')
      const [submitting, setSubmitting] = useState(false)
      async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (submitting || !value) return
        setSubmitting(true)
        await onSubmit(value)
        setSubmitting(false)
      }
      return (
        <form onSubmit={submit}>
          <Field
            error={!value ? 'Enter a value' : undefined}
            id="name"
            label="Name"
            required
          >
            {({ describedBy, invalid }) => (
              <Input
                id="name"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                required
              />
            )}
          </Field>
          <Button type="submit" loading={submitting}>
            Save
          </Button>
        </form>
      )
    }

    render(<GenericForm />)
    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(input).toHaveAttribute('aria-describedby', 'name-error')
    await user.type(input, 'Ada')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    const button = screen.getByRole('button', { name: 'Save' })
    await user.click(button)
    await user.click(button)
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(button).toHaveAttribute('aria-busy', 'true')
    finishSubmit()
  })
})
