import type { FormEvent } from 'react'
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from '../../../shared/components/ui'
import {
  EMPLOYMENT_TYPES,
  WORKPLACE_TYPES,
  type JobInput,
} from '../types/job.types'
import { employmentLabel, workplaceLabel } from '../utils/job-utils'
export function JobForm({
  value,
  errors,
  busy,
  submitLabel,
  secondaryLabel,
  onChange,
  onSubmit,
  onSecondary,
  onCancel,
}: {
  value: JobInput
  errors: Record<string, string>
  busy: boolean
  submitLabel: string
  secondaryLabel?: string
  onChange: (v: JobInput) => void
  onSubmit: () => void
  onSecondary?: () => void
  onCancel: () => void
}) {
  const field = <K extends keyof JobInput>(key: K, next: JobInput[K]) =>
    onChange({ ...value, [key]: next })
  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <FormSection title="Basic information">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="job-title" label="Job title" error={errors.title}>
            {(p) => (
              <Input
                id="job-title"
                value={value.title}
                maxLength={160}
                onChange={(e) => field('title', e.target.value)}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              />
            )}
          </Field>
          <Field
            id="job-department"
            label="Department"
            error={errors.department}
          >
            {(p) => (
              <Input
                id="job-department"
                value={value.department ?? ''}
                maxLength={100}
                onChange={(e) => field('department', e.target.value || null)}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              />
            )}
          </Field>
          <Field
            id="job-openings"
            label="Number of openings"
            required
            error={errors.openings}
          >
            {(p) => (
              <Input
                id="job-openings"
                type="number"
                min={1}
                max={1000}
                value={value.openings ?? 1}
                onChange={(e) => field('openings', Number(e.target.value))}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              />
            )}
          </Field>
        </div>
      </FormSection>
      <FormSection title="Employment">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="job-employment"
            label="Employment type"
            error={errors.employmentType}
          >
            {(p) => (
              <Select
                id="job-employment"
                value={value.employmentType ?? ''}
                onChange={(e) =>
                  field(
                    'employmentType',
                    (e.target.value || undefined) as JobInput['employmentType'],
                  )
                }
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              >
                <option value="">Select type</option>
                {EMPLOYMENT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {employmentLabel(v)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="job-workplace"
            label="Workplace type"
            error={errors.workplaceType}
          >
            {(p) => (
              <Select
                id="job-workplace"
                value={value.workplaceType ?? ''}
                onChange={(e) =>
                  field(
                    'workplaceType',
                    (e.target.value || undefined) as JobInput['workplaceType'],
                  )
                }
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              >
                <option value="">Select workplace</option>
                {WORKPLACE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {workplaceLabel(v)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="job-location"
            label="Location"
            helperText={
              ['ONSITE', 'HYBRID'].includes(value.workplaceType ?? '')
                ? 'Required before this job can be opened.'
                : undefined
            }
            error={errors.location}
          >
            {(p) => (
              <Input
                id="job-location"
                value={value.location ?? ''}
                maxLength={160}
                onChange={(e) => field('location', e.target.value || null)}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
              />
            )}
          </Field>
        </div>
      </FormSection>
      <FormSection title="Job description">
        <Field
          id="job-description"
          label="Description"
          error={errors.description}
        >
          {(p) => (
            <Textarea
              id="job-description"
              className="min-h-56"
              maxLength={50000}
              value={value.description ?? ''}
              onChange={(e) => field('description', e.target.value || null)}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid}
            />
          )}
        </Field>
      </FormSection>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        {secondaryLabel && onSecondary ? (
          <Button
            type="button"
            variant="secondary"
            loading={busy}
            onClick={onSecondary}
          >
            {secondaryLabel}
          </Button>
        ) : null}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
function FormSection({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}
