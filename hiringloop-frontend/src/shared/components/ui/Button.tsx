import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const buttonVariants = cva(
  'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-control border border-transparent px-4 py-2.5 text-sm font-semibold leading-5 shadow-sm transition-colors focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary-dark text-white hover:bg-primary-hover',
        secondary:
          'border-border-strong bg-surface text-text-primary hover:bg-surface-muted hover:border-neutral-border',
        danger: 'bg-error text-white hover:bg-red-800',
        ghost: 'text-primary-dark shadow-none hover:bg-primary-soft',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode
  variant?: ButtonVariant
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className = '',
      disabled,
      loading = false,
      variant = 'primary',
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <span
            className="ui-button__spinner h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    )
  },
)
