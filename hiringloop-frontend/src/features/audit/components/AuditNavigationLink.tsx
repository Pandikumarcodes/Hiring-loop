import { Link, useLocation } from 'react-router-dom'
import { can } from '../../jobs/utils/job-utils'

export function AuditNavigationLink({
  permissions,
}: {
  permissions: readonly string[] | undefined
}) {
  const location = useLocation()
  if (!can(permissions, 'audit:view')) return null
  const active = location.pathname.endsWith('/audit')
  return (
    <Link
      className={`ml-5 mt-2 inline-block font-bold text-primary-dark ${active ? 'underline' : 'hover:underline'}`}
      to="audit"
      aria-current={active ? 'page' : undefined}
    >
      Audit
    </Link>
  )
}
