import { Button } from './Button'

interface ListPaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  loading?: boolean
}

export function ListPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  loading = false,
}: ListPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalItems)

  return (
    <nav
      aria-label="List pagination"
      className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-busy={loading || undefined}
    >
      <Button
        variant="secondary"
        disabled={loading || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-center text-sm text-text-secondary" aria-live="polite">
        {loading
          ? 'Updating results…'
          : `Showing ${firstItem}–${lastItem} of ${totalItems.toLocaleString()} · Page ${page} of ${safeTotalPages}`}
      </p>
      <Button
        variant="secondary"
        disabled={loading || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  )
}
