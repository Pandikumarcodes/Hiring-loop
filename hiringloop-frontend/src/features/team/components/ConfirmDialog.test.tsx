import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

import { ConfirmDialog } from './ConfirmDialog'

function renderDialog() {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open confirmation
        </button>
        <button type="button">Background control</button>
        {open ? (
          <ConfirmDialog
            title="Remove member?"
            description="This action removes the member."
            confirmLabel="Remove member"
            onConfirm={onConfirm}
            onCancel={() => {
              onCancel()
              setOpen(false)
            }}
          />
        ) : null}
      </>
    )
  }

  return { ...render(<Harness />), onCancel, onConfirm }
}

describe('ConfirmDialog keyboard accessibility', () => {
  afterEach(cleanup)

  test('moves focus inside on open and restores it on close', async () => {
    const user = userEvent.setup()
    renderDialog()
    const trigger = screen.getByRole('button', { name: 'Open confirmation' })

    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(trigger).toHaveFocus()
  })

  test('wraps Tab and Shift+Tab within the dialog', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Remove member' })

    confirm.focus()
    await user.tab()
    expect(cancel).toHaveFocus()

    cancel.focus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  test('does not reach background controls through Tab while open', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
    const background = screen.getByRole('button', {
      name: 'Background control',
      hidden: true,
    })

    document.body.focus()
    await user.tab()
    expect(background).not.toHaveFocus()
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    )
  })

  test('closes on Escape and preserves confirmation actions', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open confirmation' }))

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
    await user.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
