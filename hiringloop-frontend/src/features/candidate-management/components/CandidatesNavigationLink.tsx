import { Link } from 'react-router-dom'
import { canViewCandidates } from '../utils/candidate-management-utils'

export function CandidatesNavigationLink({
  permissions,
}: {
  permissions: readonly string[] | undefined
}) {
  if (!canViewCandidates(permissions)) return null
  return (
    <Link
      className="ml-5 mt-2 inline-block font-bold text-primary-dark hover:underline"
      to="candidates"
    >
      Candidates
    </Link>
  )
}
