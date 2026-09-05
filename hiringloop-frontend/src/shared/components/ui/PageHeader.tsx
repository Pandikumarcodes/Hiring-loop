import type { ReactNode } from 'react'

interface PageHeaderProps {
  actions?: ReactNode
  children?: ReactNode
  description?: ReactNode
  title: string
}

export function PageHeader({
  actions,
  children,
  description,
  title,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-base leading-6 text-text-secondary">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
      ) : null}
    </header>
  )
}
