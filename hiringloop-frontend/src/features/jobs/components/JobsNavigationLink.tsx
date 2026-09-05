import { Link } from 'react-router-dom'
import { can } from '../utils/job-utils'

export function JobsNavigationLink({
  permissions,
}: {
  permissions: readonly string[] | undefined
}) {
  if (!can(permissions, 'job:list')) return null
  return (
    <Link
      className="ml-5 mt-2 inline-block font-bold text-primary-dark hover:underline"
      to="jobs"
    >
      Jobs
    </Link>
  )
}
