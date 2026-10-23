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
        'ui-input h-11 min-w-0 w-full rounded-control border border-border-strong bg-surface px-3 text-sm leading-5 text-text-primary shadow-sm transition-colors file:mr-3 file:rounded-sm file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm file:font-semibold file:text-text-primary [&[type=file]]:h-auto [&[type=file]]:min-h-11 [&[type=file]]:py-2 placeholder:text-text-secondary focus-visible:border-primary-dark focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/20',
        className,
      )}
    />
  )
})
