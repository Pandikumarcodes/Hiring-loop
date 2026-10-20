import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  width?: 'standard' | 'wide'
}

export function PageContainer({
  children,
  className,
  width = 'wide',
  ...props
}: PageContainerProps) {
  return (
    <section
      className={cn(
        'mx-auto min-w-0 w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10',
        width === 'wide' ? 'max-w-7xl' : 'max-w-6xl',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
