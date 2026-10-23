import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
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
