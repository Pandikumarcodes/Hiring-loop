import { useState } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EmptyState, ErrorState, LoadingIndicator } from './feedback'
import {
  Alert,
  Badge,
  Button,
  DataTableShell,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  FilterToolbar,
  Input,
  PageHeader,
  PageContainer,
  ListPagination,
  Select,
  Textarea,
} from './ui'

afterEach(cleanup)

test('native select keeps full controlled option labels available as selection changes', async () => {
  const longLabel = 'International recruiting and platform engineering '
    .repeat(4)
    .trim()
  const change = vi.fn()
  const { rerender } = render(
    <Select aria-label="Workspace role" value="long" onChange={change}>
      <optgroup label="Available">
        <option value="long">{longLabel}</option>
        <option value="short">Recruiter</option>
      </optgroup>
    </Select>,
  )
  const select = screen.getByRole('combobox', { name: 'Workspace role' })
  expect(select).toHaveValue('long')
  expect(select).toHaveAttribute('title', longLabel)
  await userEvent.selectOptions(select, 'short')
  expect(change).toHaveBeenCalledOnce()
  rerender(
    <Select aria-label="Workspace role" value="short" onChange={change}>
      <option value="long">{longLabel}</option>
      <option value="short">Recruiter</option>
    </Select>,
  )
  expect(select).toHaveAttribute('title', 'Recruiter')
  expect(screen.getAllByRole('option')).toHaveLength(2)
})

describe('shared UI', () => {
  test.each([false, true])(
    'a conditionally mounted dialog restores focus to its opening button (autoFocus=%s)',
    async (autoFocus) => {
      const user = userEvent.setup()
      function ControlledDetails() {
        const [open, setOpen] = useState(false)
        return (
          <>
            <Button onClick={() => setOpen(true)}>Edit interview</Button>
            {open ? (
              <Dialog open onOpenChange={setOpen}>
                <DialogContent>
                  <DialogTitle>Edit interview</DialogTitle>
                  <DialogDescription>
                    Update interview details.
                  </DialogDescription>
                  <Input aria-label="Title" autoFocus={autoFocus} />
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        )
      }
      render(<ControlledDetails />)
      const trigger = screen.getByRole('button', { name: 'Edit interview' })
      await user.click(trigger)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await waitFor(() => expect(trigger).toHaveFocus())
    },
  )
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

  test('page layout primitives expose breadcrumbs, action slots, filter summaries, and table captions', () => {
    const { container } = render(
      <PageContainer width="standard" data-testid="page-container">
        <PageHeader
          title="Hiring positions"
          breadcrumbs={
            <ol>
              <li>Workspace</li>
              <li>Jobs</li>
            </ol>
          }
          primaryAction={<Button>Create job</Button>}
          secondaryActions={<Button variant="secondary">Export</Button>}
        />
        <FilterToolbar
          resultsSummary="24 results"
          clearAction={<Button variant="ghost">Clear filters</Button>}
        >
          <Input aria-label="Search records" />
        </FilterToolbar>
        <DataTableShell caption="Hiring positions">
          <thead>
            <tr>
              <th scope="col">Title</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Engineer</td>
            </tr>
          </tbody>
        </DataTableShell>
      </PageContainer>,
    )

    expect(screen.getByTestId('page-container')).toHaveClass('max-w-6xl')
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toHaveTextContent('WorkspaceJobs')
    expect(
      screen.getByRole('heading', { name: 'Hiring positions' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create job' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Export' })).toBeVisible()
    expect(
      screen.getByRole('group', { name: 'List filters' }),
    ).toHaveTextContent('24 results')
    expect(container.querySelector('caption')).toHaveTextContent(
      'Hiring positions',
    )
    expect(
      screen.getByRole('region', { name: 'Hiring positions' }),
    ).toHaveAttribute('tabindex', '0')
  })

  test('dialog wrappers preserve names, descriptions, keyboard dismissal and trigger focus', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open details</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Interview details</DialogTitle>
          <DialogDescription>Review the scheduled interview.</DialogDescription>
          <Button>Review</Button>
        </DialogContent>
      </Dialog>,
    )
    const trigger = screen.getByRole('button', { name: 'Open details' })
    await user.click(trigger)
    expect(
      screen.getByRole('dialog', { name: 'Interview details' }),
    ).toHaveAccessibleDescription('Review the scheduled interview.')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  test('list pagination reports authoritative totals and disables boundary controls', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const { rerender } = render(
      <ListPagination
        page={2}
        pageSize={25}
        totalItems={51}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByText('Showing 26–50 of 51 · Page 2 of 3')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    rerender(
      <ListPagination
        page={3}
        pageSize={25}
        totalItems={51}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    rerender(
      <ListPagination
        page={1}
        pageSize={25}
        totalItems={51}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  test('semantic status styles preserve accessible content and native busy behavior', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <Alert variant="warning">Review required</Alert>
        <Badge variant="info">Scheduled</Badge>
        <Button loading onClick={onClick}>
          Saving
        </Button>
      </>,
    )

    expect(screen.getByText('Review required')).toHaveClass('bg-warning-soft')
    expect(screen.getByText('Scheduled')).toHaveClass('ui-badge--info')
    const button = screen.getByRole('button', { name: 'Saving' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
