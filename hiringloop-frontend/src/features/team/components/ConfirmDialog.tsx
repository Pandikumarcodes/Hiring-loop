import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../../shared/components/ui'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',')

function isFocusable(element: HTMLElement) {
  if (!element.isConnected || element.matches(':disabled')) return false
  const tabindex = element.getAttribute('tabindex')
  return tabindex === null || (tabindex !== '-1' && /^-?\d+$/.test(tabindex))
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isFocusable)
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  busy = false,
}: {
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const [previous] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const focusables = getFocusableElements(dialog)
    ;(focusables[0] ?? dialog).focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const current = document.activeElement
      const elements = getFocusableElements(dialog)
      if (!elements.length) {
        e.preventDefault()
        dialog.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!dialog.contains(current)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => {
      document.removeEventListener('keydown', handler, true)
      if (previous && isFocusable(previous)) previous.focus()
    }
  }, [previous])
  return (
    <div className="team-dialog-backdrop">
      <section
        ref={dialogRef}
        className="team-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-dialog-title"
        tabIndex={-1}
      >
        <h2 id="team-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="team-dialog__actions">
          <Button
            autoFocus
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
