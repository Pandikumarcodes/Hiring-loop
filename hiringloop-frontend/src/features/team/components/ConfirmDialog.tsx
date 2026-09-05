import { useRef, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../shared/components/ui'

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
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent
        aria-describedby="team-dialog-description"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          cancelRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          previousRef.current?.focus()
        }}
      >
        <DialogTitle className="pr-8 text-lg font-bold">{title}</DialogTitle>
        <DialogDescription
          id="team-dialog-description"
          className="mt-3 text-sm leading-6 text-text-secondary"
        >
          {description}
        </DialogDescription>
        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Button
            ref={cancelRef}
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
      </DialogContent>
    </Dialog>
  )
}
