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
        <nav
          aria-label="Breadcrumb"
          className="mb-3 min-w-0 text-sm [overflow-wrap:anywhere]"
        >
          {breadcrumbs}
        </nav>
      ) : null}
      <header className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 sm:basis-72">
          <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions || primaryAction || secondaryActions ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:justify-end">
            {secondaryActions ? (
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                {secondaryActions}
              </div>
            ) : null}
            {actions ? (
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                {actions}
              </div>
            ) : null}
            {primaryAction ? (
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                {primaryAction}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
    </>
  )
}
