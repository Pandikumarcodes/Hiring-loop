import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        'ui-textarea min-h-28 min-w-0 w-full resize-y rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm leading-6 text-text-primary shadow-sm transition-colors placeholder:text-text-secondary focus-visible:border-primary-dark focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/20',
        className,
      )}
    />
  )
})
