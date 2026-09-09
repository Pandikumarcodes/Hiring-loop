import { Link } from 'react-router-dom'
export function TalentPoolsNavigationLink({
  permissions,
}: {
  permissions: readonly string[] | undefined
}) {
  return permissions?.includes('talent-pool:view') ? (
    <Link
      className="ml-5 mt-2 inline-block font-bold text-primary-dark hover:underline"
      to="talent-pools"
    >
      Talent pools
    </Link>
  ) : null
}
