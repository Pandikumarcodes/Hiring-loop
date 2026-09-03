import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EmptyState, ErrorState, LoadingIndicator } from './feedback'
import { Badge, Button, Field, Input, PageHeader, Select, Textarea } from './ui'

describe('shared UI', () => {
  test('Button preserves native semantics, click behavior, variants, and disabled state', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} variant="secondary">
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeEnabled()
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()

    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  test('Field associates its label and descriptions with a native input', () => {
    render(
      <Field
        error="Enter a valid value"
        helperText="Use your work email."
        id="email"
        label="Email"
        required
      >
        {({ describedBy, invalid }) => (
          <Input
            aria-describedby={describedBy}
            aria-invalid={invalid}
            id="email"
            name="email"
            type="email"
          />
        )}
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Use your work email. Enter a valid value',
    )
    expect(input).toHaveAttribute('name', 'email')
  })

  test('Textarea and Select remain native controls', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Textarea aria-label="Notes" defaultValue="Initial" />
        <Select aria-label="Priority" defaultValue="low">
          <option value="low">Low</option>
          <option value="high">High</option>
        </Select>
      </>,
    )

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue(
      'Initial',
    )
    const select = screen.getByRole('combobox', { name: 'Priority' })
    await user.selectOptions(select, 'high')
    expect(select).toHaveValue('high')
  })

  test('feedback components expose useful semantics and compose actions', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <>
        <LoadingIndicator label="Loading records" />
        <EmptyState
          title="Nothing here"
          description="There are no records yet."
        />
        <ErrorState
          description="Please try again."
          action={<Button onClick={onRetry}>Retry</Button>}
        />
      </>,
    )

    expect(
      screen.getByRole('status', { name: 'Loading records' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeVisible()
    expect(
      screen.getByRole('alert', { name: 'Something went wrong' }),
    ).toHaveTextContent('Please try again.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  test('PageHeader and Badge are composable and presentational', () => {
    render(
      <PageHeader title="A reusable page">
        <Badge variant="success">Ready</Badge>
      </PageHeader>,
    )

    expect(
      screen.getByRole('heading', { name: 'A reusable page' }),
    ).toBeVisible()
    expect(screen.getByText('Ready')).toHaveClass('ui-badge--success')
  })
})
