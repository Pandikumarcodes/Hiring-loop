import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export function DialogContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: DialogPrimitive.DialogContentProps) {
  const previousFocus = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 min-w-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-card border border-border bg-surface-raised p-4 shadow-popover outline-none [overflow-wrap:anywhere] focus-visible:outline-3 focus-visible:outline-primary-dark sm:p-5',
          className,
        )}
        {...props}
        onOpenAutoFocus={(event) => {
          const activeElement = document.activeElement
          // A React autoFocus field may already own focus when Radix fires this
          // event. Keep the opener captured before that field was mounted.
          if (
            activeElement instanceof HTMLElement &&
            !(
              event.target instanceof HTMLElement &&
              event.target.contains(activeElement)
            )
          )
            previousFocus.current = activeElement
          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (!event.defaultPrevented && previousFocus.current?.isConnected) {
            event.preventDefault()
            previousFocus.current.focus()
          }
        }}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-3 focus-visible:outline-primary-dark sm:right-4 sm:top-4"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
export function DialogTitle({
  className,
  ...props
}: DialogPrimitive.DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn(
        'pr-12 text-lg font-bold leading-7 text-text-primary [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  )
}
export function DialogDescription({
  className,
  ...props
}: DialogPrimitive.DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn(
        'mt-2 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  )
}
export const DialogClose = DialogPrimitive.Close
