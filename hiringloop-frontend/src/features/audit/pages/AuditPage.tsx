import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ErrorState,
  EmptyState,
  LoadingState,
} from '../../../shared/components/feedback'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  PageHeader,
  Select,
} from '../../../shared/components/ui'
import { useOrganization } from '../../organizations/hooks/queries'
import { can } from '../../jobs/utils/job-utils'
import { useAuditEvent, useAuditEvents } from '../hooks/queries'
import type { AuditFilters, AuditEvent } from '../types/audit.types'
import {
  actionLabel,
  formatTimestamp,
  resourceLabel,
} from '../utils/audit-utils'
import {
  calendarDaySpan,
  calendarEndUtc,
  calendarStartUtc,
} from '../../analytics/utils/analytics-utils'

const resourceTypes = [
  'ORGANIZATION',
  'MEMBERSHIP',
  'INVITATION',
  'JOB',
  'PIPELINE_STAGE',
  'APPLICATION_FORM',
  'INTERVIEW',
  'SCORECARD_TEMPLATE',
  'SCORECARD',
  'COMMUNICATION',
  'OFFER',
  'APPLICATION',
  'TALENT_POOL',
  'TALENT_POOL_MEMBER',
]

export function AuditPage() {
  const { organizationId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const allowed = can(organization.data?.permissions, 'audit:view')
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const actorUserId = params.get('actorUserId') ?? ''
  const action = params.get('action') ?? ''
  const resourceType = params.get('resourceType') ?? ''
  const resourceId = params.get('resourceId') ?? ''
  const dateValid =
    (!from || isCalendarDate(from)) &&
    (!to || isCalendarDate(to)) &&
    (!from || !to || from <= to) &&
    (!from || !to || calendarDaySpan(from, to) <= 366)
  const filters = useMemo<AuditFilters>(
    () => ({
      ...(from && isCalendarDate(from) ? { from: calendarStartUtc(from) } : {}),
      ...(to && isCalendarDate(to) ? { to: calendarEndUtc(to) } : {}),
      ...(actorUserId.trim() ? { actorUserId: actorUserId.trim() } : {}),
      ...(action.trim() ? { action: action.trim() } : {}),
      ...(resourceType.trim() ? { resourceType: resourceType.trim() } : {}),
      ...(resourceId.trim() ? { resourceId: resourceId.trim() } : {}),
    }),
    [from, to, actorUserId, action, resourceType, resourceId],
  )
  const pageValue = Number(params.get('page'))
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const list = useAuditEvents(
    organizationId,
    filters,
    page,
    25,
    Boolean(organization.data && allowed && dateValid),
  )
  const detail = useAuditEvent(
    organizationId,
    selectedId ?? '',
    Boolean(selectedId && allowed),
  )

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  if (organization.isPending) return <LoadingState label="Loading audit log" />
  if (organization.isError || !allowed)
    return (
      <Page>
        <ErrorState
          title="Audit access unavailable"
          description="You do not have permission to view the audit log in this workspace."
        />
      </Page>
    )

  return (
    <Page>
      <PageHeader
        title="Audit Log"
        description="Read-only record of workspace activity."
      />
      <AuditFilterBar params={params} from={from} to={to} onChange={update} />
      {!dateValid ? (
        <p
          className="mb-6 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Choose a valid audit date range with a start on or before the end
          date.
        </p>
      ) : null}
      <section aria-labelledby="audit-events-heading" className="mt-7">
        <h2 id="audit-events-heading" className="mb-3 text-xl font-bold">
          Events
        </h2>
        {list.isPending ? (
          <LoadingState label="Loading audit events" />
        ) : list.isError ? (
          <ErrorState
            description="We could not load audit events."
            onRetry={() => void list.refetch()}
          />
        ) : list.data?.auditEvents.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="Try adjusting the current filters."
          />
        ) : list.data ? (
          <>
            <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-sm">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <caption className="sr-only">Workspace audit events</caption>
                <thead className="bg-slate-50 text-text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actor
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Resource
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.auditEvents.map((event) => (
                    <AuditRow
                      key={event.id}
                      event={event}
                      onOpen={() => setSelectedId(event.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.pagination.page}
              totalPages={Math.max(1, list.data.pagination.totalPages)}
              onPageChange={(value) => update('page', String(value))}
            />
          </>
        ) : null}
      </section>
      {selectedId ? (
        <AuditDetailDialog query={detail} onClose={() => setSelectedId(null)} />
      ) : null}
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {children}
    </section>
  )
}

function AuditFilterBar({
  params,
  from,
  to,
  onChange,
}: {
  params: URLSearchParams
  from: string
  to: string
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="grid gap-4 rounded-card border border-border bg-surface p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-sm font-bold">
        <span>From</span>
        <Input
          type="date"
          value={from}
          onChange={(event) => onChange('from', event.target.value)}
          aria-label="Audit start date"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>To</span>
        <Input
          type="date"
          value={to}
          onChange={(event) => onChange('to', event.target.value)}
          aria-label="Audit end date"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>Action</span>
        <Input
          value={params.get('action') ?? ''}
          onChange={(event) => onChange('action', event.target.value)}
          placeholder="e.g. OFFER_SENT"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>Resource type</span>
        <Select
          value={params.get('resourceType') ?? ''}
          onChange={(event) => onChange('resourceType', event.target.value)}
          aria-label="Audit resource type"
        >
          <option value="">All resource types</option>
          {resourceTypes.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll('_', ' ')}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>Actor user ID</span>
        <Input
          value={params.get('actorUserId') ?? ''}
          onChange={(event) => onChange('actorUserId', event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>Resource ID</span>
        <Input
          value={params.get('resourceId') ?? ''}
          onChange={(event) => onChange('resourceId', event.target.value)}
        />
      </label>
      <div className="flex items-end">
        <Badge>Safe aggregate audit data</Badge>
      </div>
    </div>
  )
}

function AuditRow({
  event,
  onOpen,
}: {
  event: AuditEvent
  onOpen: () => void
}) {
  const actor =
    event.actorType === 'SYSTEM' ? 'System' : (event.actor?.email ?? 'User')
  return (
    <tr className="border-t border-border align-top">
      <td className="whitespace-nowrap px-4 py-3">
        {formatTimestamp(event.occurredAt)}
      </td>
      <td className="px-4 py-3">{actor}</td>
      <td className="px-4 py-3 font-semibold">{actionLabel(event.action)}</td>
      <td className="px-4 py-3">
        {resourceLabel(event.resourceType, event.resourceId)}
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          onClick={onOpen}
          aria-label={`Open details for ${actionLabel(event.action)}`}
        >
          View details
        </Button>
      </td>
    </tr>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous audit page"
      >
        Previous
      </Button>
      <span className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next audit page"
      >
        Next
      </Button>
    </div>
  )
}

function AuditDetailDialog({
  query,
  onClose,
}: {
  query: ReturnType<typeof useAuditEvent>
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="audit-detail-description">
        <DialogTitle>Audit event details</DialogTitle>
        <DialogDescription id="audit-detail-description">
          Safe structured values returned for this audit event.
        </DialogDescription>
        {query.isPending ? (
          <LoadingState label="Loading audit event details" />
        ) : query.isError ? (
          <ErrorState
            description="We could not load this audit event."
            onRetry={() => void query.refetch()}
          />
        ) : query.data ? (
          <DetailContent event={query.data} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DetailContent({ event }: { event: AuditEvent }) {
  return (
    <div className="mt-5 grid gap-5 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Action" value={actionLabel(event.action)} />
        <DetailField
          label="Actor"
          value={
            event.actorType === 'SYSTEM'
              ? 'System'
              : (event.actor?.email ?? 'User')
          }
        />
        <DetailField
          label="Occurred"
          value={formatTimestamp(event.occurredAt)}
        />
        <DetailField
          label="Resource"
          value={resourceLabel(event.resourceType, event.resourceId)}
        />
      </dl>
      <StructuredBlock title="Before" value={event.before} />
      <StructuredBlock title="After" value={event.after} />
      <StructuredBlock title="Metadata" value={event.metadata} />
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="mt-1 font-semibold break-words">{value}</dd>
    </div>
  )
}

function StructuredBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h3 className="font-bold">{title}</h3>
      {value == null ? (
        <p className="mt-2 text-text-secondary">None</p>
      ) : (
        <StructuredValue value={value} />
      )}
    </section>
  )
}

function StructuredValue({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <ul className="mt-2 grid gap-2 rounded-control border border-border p-3">
        {value.map((item, index) => (
          <li key={index}>
            <StructuredValue value={item} />
          </li>
        ))}
      </ul>
    )
  if (typeof value === 'object' && value !== null)
    return (
      <dl className="mt-2 grid gap-2 rounded-control border border-border p-3">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div
            key={key}
            className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]"
          >
            <dt className="font-semibold">{key}</dt>
            <dd className="break-words">
              <StructuredValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    )
  return <span className="mt-2 inline-block break-words">{String(value)}</span>
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}
