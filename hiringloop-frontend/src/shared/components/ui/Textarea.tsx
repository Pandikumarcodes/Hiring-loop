import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'ui-textarea min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-secondary/70 focus:border-primary-dark focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  )
}
