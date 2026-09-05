import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const buttonVariants = cva(
  'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary:
          'border border-border bg-surface text-text-primary hover:bg-background',
        danger: 'bg-error text-white hover:bg-red-600',
        ghost: 'text-primary-dark hover:bg-primary-soft',
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
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    )
  },
)
