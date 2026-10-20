import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = '', ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        'ui-input h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-secondary focus-visible:border-primary-dark focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/20',
        className,
      )}
    />
  )
})
