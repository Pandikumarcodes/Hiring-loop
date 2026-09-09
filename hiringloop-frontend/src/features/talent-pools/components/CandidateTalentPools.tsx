import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../shared/components/ui'
import { usePools } from '../hooks/queries'
import { useTalentPoolActions } from '../hooks/mutations'
export function CandidateTalentPools({
  organizationId,
  candidateId,
  permissions,
}: {
  organizationId: string
  candidateId: string
  permissions: readonly string[]
}) {
  const view = permissions.includes('talent-pool:view'),
    manage = permissions.includes('talent-pool-member:manage')
  const pools = usePools(organizationId, 1, '', view)
  const [adding, setAdding] = useState(false)
  const [knownPoolIds, setKnownPoolIds] = useState<readonly string[]>([])
  if (!view) return null
  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Talent pools</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Add this candidate to a pool. Complete membership management is
            available on each Talent Pool page.
          </p>
        </div>
        {manage ? (
          <Button onClick={() => setAdding(true)}>Add to pool</Button>
        ) : null}
      </div>
      {pools.isPending ? (
        <p className="mt-4 text-sm">Loading talent pools…</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {knownPoolIds.length ? (
            (pools.data?.pools ?? [])
              .filter((pool) => knownPoolIds.includes(pool.id))
              .map((pool) => (
                <KnownMembership
                  key={pool.id}
                  organizationId={organizationId}
                  candidateId={candidateId}
                  pool={pool}
                  canManage={manage}
                  onRemoved={() =>
                    setKnownPoolIds((ids) => ids.filter((id) => id !== pool.id))
                  }
                />
              ))
          ) : (
            <p className="text-sm text-text-secondary">
              Memberships are not exhaustively loaded here to avoid scanning
              every pool. Open a Talent Pool page to view all of its members.
            </p>
          )}
        </div>
      )}
      {adding ? (
        <AddDialog
          organizationId={organizationId}
          candidateId={candidateId}
          onClose={() => setAdding(false)}
          onAdded={(poolId) =>
            setKnownPoolIds((ids) =>
              ids.includes(poolId) ? ids : [...ids, poolId],
            )
          }
        />
      ) : null}
    </section>
  )
}
function KnownMembership({
  organizationId,
  candidateId,
  pool,
  canManage,
  onRemoved,
}: {
  organizationId: string
  candidateId: string
  pool: import('../types/talent-pools.types').TalentPoolDto
  canManage: boolean
  onRemoved: () => void
}) {
  const action = useTalentPoolActions(organizationId)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border p-3">
      <Link
        className="font-semibold text-primary-dark hover:underline"
        to={`/app/organizations/${organizationId}/talent-pools/${pool.id}`}
      >
        {pool.name}
      </Link>
      {canManage ? (
        <Button
          variant="danger"
          loading={action.remove.isPending}
          onClick={() =>
            action.remove.mutate(
              { poolId: pool.id, candidateId },
              { onSuccess: onRemoved },
            )
          }
        >
          Remove
        </Button>
      ) : null}
    </div>
  )
}
function AddDialog({
  organizationId,
  candidateId,
  onClose,
  onAdded,
}: {
  organizationId: string
  candidateId: string
  onClose: () => void
  onAdded: (poolId: string) => void
}) {
  const pools = usePools(organizationId, 1, '', true)
  const actions = useTalentPoolActions(organizationId)
  const [poolId, setPoolId] = useState('')
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && !actions.add.isPending && onClose()}
    >
      <DialogContent aria-describedby="add-pool-description">
        <DialogTitle>Add candidate to talent pool</DialogTitle>
        <DialogDescription id="add-pool-description">
          Choose a pool. Existing membership is retained safely.
        </DialogDescription>
        <select
          className="mt-4 h-11 w-full rounded-control border border-border bg-surface px-3"
          aria-label="Talent pool"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
        >
          <option value="">Select a talent pool</option>
          {pools.data?.pools.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {actions.add.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            We could not add this candidate.
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!poolId}
            loading={actions.add.isPending}
            onClick={() =>
              actions.add.mutate(
                { poolId, candidateId },
                {
                  onSuccess: () => {
                    onAdded(poolId)
                    onClose()
                  },
                },
              )
            }
          >
            Add candidate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
