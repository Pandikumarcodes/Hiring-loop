import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-card border border-border bg-surface-raised shadow-surface',
        className,
      )}
      {...props}
    />
  )
}
