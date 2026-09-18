import { Link, useLocation } from 'react-router-dom'
import { can } from '../../jobs/utils/job-utils'

export function AnalyticsNavigationLink({
  permissions,
}: {
  permissions: readonly string[] | undefined
}) {
  const location = useLocation()
  if (!can(permissions, 'analytics:view')) return null
  const active = location.pathname.endsWith('/analytics')
  return (
    <Link
      className={`ml-5 mt-2 inline-block font-bold ${active ? 'text-primary-dark underline' : 'text-primary-dark hover:underline'}`}
      to="analytics"
      aria-current={active ? 'page' : undefined}
    >
      Analytics
    </Link>
  )
}
