import type { ReactNode } from 'react'

interface PageHeaderProps {
  actions?: ReactNode
  children?: ReactNode
  description?: ReactNode
  breadcrumbs?: ReactNode
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  title: string
}

export function PageHeader({
  actions,
  children,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  title,
}: PageHeaderProps) {
  return (
    <>
      {breadcrumbs ? (
        <nav aria-label="Breadcrumb" className="mb-3 min-w-0 text-sm">
          {breadcrumbs}
        </nav>
      ) : null}
      <header className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-bold leading-tight tracking-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-base leading-6 text-text-secondary">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions || primaryAction || secondaryActions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {secondaryActions ? (
              <div className="flex flex-wrap items-center gap-2">
                {secondaryActions}
              </div>
            ) : null}
            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
            {primaryAction ? (
              <div className="flex flex-wrap items-center gap-2">
                {primaryAction}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
    </>
  )
}
