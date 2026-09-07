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
        'ui-input h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-secondary/70 focus:border-primary-dark focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-error',
        className,
      )}
    />
  )
})
