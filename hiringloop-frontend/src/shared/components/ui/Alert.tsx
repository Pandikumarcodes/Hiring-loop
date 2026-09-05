import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-control border border-teal-200 bg-primary-soft px-4 py-3 text-sm leading-6 text-teal-900',
        className,
      )}
      {...props}
    />
  )
}
