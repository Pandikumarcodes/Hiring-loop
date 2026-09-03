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
    <header className="ui-page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {actions ? (
        <div className="ui-page-header__actions">{actions}</div>
      ) : null}
    </header>
  )
}
