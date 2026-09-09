import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  PageHeader,
  Textarea,
} from '../../../shared/components/ui'
import {
  ErrorState,
  LoadingState,
  EmptyState,
} from '../../../shared/components/feedback'
import { useOrganization } from '../../organizations/hooks/queries'
import { usePools } from '../hooks/queries'
import { useTalentPoolActions } from '../hooks/mutations'
import type { TalentPoolDto } from '../types/talent-pools.types'
export function TalentPoolsPage() {
  const { organizationId = '' } = useParams()
  const org = useOrganization(organizationId, !!organizationId)
  const permissions = (org.data?.permissions ?? []) as readonly string[]
  const allowed = permissions.includes('talent-pool:view')
  const manage = permissions.includes('talent-pool:manage')
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [editing, setEditing] = useState<TalentPoolDto | null | undefined>()
  const pools = usePools(organizationId, page, search, allowed)
  if (org.isPending) return <LoadingState label="Checking talent pool access" />
  if (!allowed)
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState title="Talent pool access unavailable" />
      </main>
    )
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Talent pools"
        description="Organize candidates for future opportunities."
        actions={
          manage ? (
            <Button onClick={() => setEditing(null)}>Create talent pool</Button>
          ) : undefined
        }
      />
      <Input
        className="mt-6 max-w-md"
        aria-label="Search talent pools"
        placeholder="Search pools"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      {pools.isPending ? (
        <LoadingState label="Loading talent pools" />
      ) : pools.isError ? (
        <ErrorState
          title="Talent pools unavailable"
          onRetry={() => void pools.refetch()}
        />
      ) : pools.data?.pools.length ? (
        <div className="mt-5 grid gap-3">
          {pools.data.pools.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap justify-between gap-3 rounded-card border border-border bg-surface p-5"
            >
              <div>
                <Link
                  className="font-bold text-primary-dark hover:underline"
                  to={`/app/organizations/${organizationId}/talent-pools/${p.id}`}
                >
                  {p.name}
                </Link>
                <p className="mt-1 text-sm text-text-secondary">
                  {p.description ?? 'No description'} · {p.memberCount} members
                </p>
              </div>
              {manage ? (
                <Button variant="secondary" onClick={() => setEditing(p)}>
                  Edit
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No talent pools"
            description="Create a pool to organize candidates."
          />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={(pools.data?.pools.length ?? 0) < 25}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      {editing !== undefined ? (
        <PoolForm
          organizationId={organizationId}
          pool={editing}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </main>
  )
}
export function PoolForm({
  organizationId,
  pool,
  onClose,
}: {
  organizationId: string
  pool: TalentPoolDto | null
  onClose: () => void
}) {
  const a = useTalentPoolActions(organizationId)
  const [name, setName] = useState(pool?.name ?? ''),
    [description, setDescription] = useState(pool?.description ?? '')
  const m = pool ? a.update : a.create
  return (
    <Dialog open onOpenChange={(x) => !x && !m.isPending && onClose()}>
      <DialogContent aria-describedby="pool-form-description">
        <DialogTitle>
          {pool ? 'Edit talent pool' : 'Create talent pool'}
        </DialogTitle>
        <DialogDescription id="pool-form-description">
          Use a clear name and optional description.
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <Field id="pool-name" label="Name" required>
            {() => (
              <Input
                id="pool-name"
                value={name}
                maxLength={160}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field id="pool-description" label="Description">
            {() => (
              <Textarea
                id="pool-description"
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          {m.isError ? (
            <p role="alert" className="text-sm text-error">
              This pool may have changed elsewhere. Reload and try again.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              loading={m.isPending}
              onClick={() =>
                m.mutate(
                  pool
                    ? {
                        id: pool.id,
                        name: name.trim(),
                        description: description.trim() || undefined,
                        expectedRevision: pool.revision,
                      }
                    : ({
                        name: name.trim(),
                        description: description.trim() || undefined,
                      } as never),
                  { onSuccess: onClose },
                )
              }
            >
              Save pool
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
