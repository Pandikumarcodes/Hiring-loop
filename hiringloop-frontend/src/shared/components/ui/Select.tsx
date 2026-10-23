import {
  Children,
  forwardRef,
  isValidElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '../../utils/cn'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', ...props }, ref) {
  return (
    <select
      {...props}
      ref={ref}
      title={
        props.title ??
        (typeof props.value === 'string'
          ? optionTitle(props.children, props.value)
          : undefined)
      }
      className={cn(
        'ui-select appearance-none bg-no-repeat h-11 min-w-0 w-full rounded-control border border-border-strong bg-surface pl-3 pr-10 text-sm leading-5 text-text-primary shadow-sm transition-colors focus-visible:border-primary-dark focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/20',
        className,
      )}
    />
  )
})

function optionTitle(children: ReactNode, value: string): string | undefined {
  for (const child of Children.toArray(children)) {
    if (
      !isValidElement<{ value?: string | number; children?: ReactNode }>(child)
    )
      continue
    if (
      child.type === 'option' &&
      String(child.props.value) === value &&
      (typeof child.props.children === 'string' ||
        typeof child.props.children === 'number')
    )
      return String(child.props.children)
    if (child.type === 'optgroup') {
      const title = optionTitle(child.props.children, value)
      if (title !== undefined) return title
    }
  }
}
