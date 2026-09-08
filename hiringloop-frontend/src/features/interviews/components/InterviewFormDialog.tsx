import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  Select,
} from '../../../shared/components/ui'
import { useMembers } from '../../team/hooks/queries'
import type {
  InterviewDto,
  ScheduleInterviewInput,
} from '../types/interview.types'
import {
  browserTimeZone,
  dateInput,
  duration,
  localInZoneToIso,
  timeInput,
} from '../utils/interview-utils'
const zones =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London']
export function InterviewFormDialog({
  organizationId,
  interview,
  mode = 'schedule',
  onSubmit,
  onClose,
  busy,
  error,
}: {
  organizationId: string
  interview?: InterviewDto
  mode?: 'schedule' | 'edit' | 'reschedule'
  onSubmit: (v: ScheduleInterviewInput) => void
  onClose: () => void
  busy: boolean
  error?: string
}) {
  const tz = interview?.timeZone ?? browserTimeZone(),
    [title, setTitle] = useState(interview?.title ?? ''),
    [format, setFormat] = useState<ScheduleInterviewInput['format']>(
      interview?.format ?? 'VIDEO',
    ),
    [date, setDate] = useState(
      interview
        ? dateInput(interview.scheduledStartAt, tz)
        : new Date().toISOString().slice(0, 10),
    ),
    [time, setTime] = useState(
      interview ? timeInput(interview.scheduledStartAt, tz) : '10:00',
    ),
    [zone, setZone] = useState(tz),
    [minutes, setMinutes] = useState(
      String(interview ? duration(interview) : 60),
    ),
    [ids, setIds] = useState<string[]>(
      interview?.participants.map((p) => p.user.id) ?? [],
    ),
    [meetingUrl, setMeetingUrl] = useState(interview?.meetingUrl ?? ''),
    [location, setLocation] = useState(interview?.location ?? ''),
    [formError, setFormError] = useState('')
  const members = useMembers(organizationId)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !title.trim() ||
      !date ||
      !time ||
      !zone ||
      +minutes < 1 ||
      !ids.length
    ) {
      setFormError(
        'Complete the required fields and select at least one interviewer.',
      )
      return
    }
    onSubmit({
      title: title.trim(),
      format,
      scheduledStartAt: localInZoneToIso(date, time, zone),
      durationMinutes: +minutes,
      timeZone: zone,
      participantUserIds: ids,
      meetingUrl: format === 'VIDEO' ? meetingUrl.trim() || null : null,
      location: format === 'ONSITE' ? location.trim() || null : null,
    })
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent aria-describedby="interview-form-description">
        <DialogTitle>
          {mode === 'edit'
            ? 'Edit interview'
            : mode === 'reschedule'
              ? 'Reschedule interview'
              : 'Schedule interview'}
        </DialogTitle>
        <DialogDescription id="interview-form-description">
          Choose the interview details and assigned organization members.
        </DialogDescription>
        <form className="mt-5 grid gap-4" onSubmit={submit} noValidate>
          {error || formError ? (
            <p
              role="alert"
              className="rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error || formError}
            </p>
          ) : null}
          {mode !== 'reschedule' ? (
            <Field id="interview-title" label="Interview title" required>
              {(p) => (
                <Input
                  id="interview-title"
                  value={title}
                  maxLength={160}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-describedby={p.describedBy}
                />
              )}
            </Field>
          ) : null}
          {mode !== 'reschedule' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="interview-format" label="Format" required>
                {(p) => (
                  <Select
                    id="interview-format"
                    value={format}
                    onChange={(e) => {
                      const next = e.target
                        .value as ScheduleInterviewInput['format']
                      setFormat(next)
                      if (next !== 'VIDEO') setMeetingUrl('')
                      if (next !== 'ONSITE') setLocation('')
                    }}
                    aria-describedby={p.describedBy}
                  >
                    <option value="VIDEO">Video</option>
                    <option value="PHONE">Phone</option>
                    <option value="ONSITE">Onsite</option>
                  </Select>
                )}
              </Field>
              <Field id="interview-duration" label="Duration" required>
                {(p) => (
                  <Select
                    id="interview-duration"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    aria-describedby={p.describedBy}
                  >
                    {[30, 45, 60, 90, 120].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                )}
              </Field>
              {mode === 'schedule' ? (
                <Field id="interview-date" label="Date" required>
                  {(p) => (
                    <Input
                      id="interview-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-describedby={p.describedBy}
                    />
                  )}
                </Field>
              ) : null}
              {mode === 'schedule' ? (
                <Field id="interview-time" label="Start time" required>
                  {(p) => (
                    <Input
                      id="interview-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      aria-describedby={p.describedBy}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          ) : null}
          {mode !== 'edit' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {mode === 'reschedule' ? (
                  <Field id="interview-date" label="Date" required>
                    {(p) => (
                      <Input
                        id="interview-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        aria-describedby={p.describedBy}
                      />
                    )}
                  </Field>
                ) : null}
                {mode === 'reschedule' ? (
                  <Field id="interview-time" label="Start time" required>
                    {(p) => (
                      <Input
                        id="interview-time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        aria-describedby={p.describedBy}
                      />
                    )}
                  </Field>
                ) : null}
              </div>
              <Field id="interview-timezone" label="Timezone" required>
                {(p) => (
                  <Select
                    id="interview-timezone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    aria-describedby={p.describedBy}
                  >
                    {zones.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          ) : null}
          {mode !== 'reschedule' && format === 'VIDEO' ? (
            <Field id="interview-url" label="Meeting URL">
              {(p) => (
                <Input
                  id="interview-url"
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  aria-describedby={p.describedBy}
                />
              )}
            </Field>
          ) : null}
          {mode !== 'reschedule' && format === 'ONSITE' ? (
            <Field id="interview-location" label="Physical location">
              {(p) => (
                <Input
                  id="interview-location"
                  value={location}
                  maxLength={240}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-describedby={p.describedBy}
                />
              )}
            </Field>
          ) : null}
          {mode !== 'reschedule' ? (
            <fieldset>
              <legend className="font-semibold">
                Interviewers <span aria-hidden="true">*</span>
              </legend>
              {members.isPending ? (
                <p className="mt-2 text-sm text-text-secondary">
                  Loading organization members…
                </p>
              ) : members.isError ? (
                <p role="alert" className="mt-2 text-sm text-red-800">
                  Members could not be loaded.
                </p>
              ) : (
                <div className="mt-2 grid max-h-40 gap-2 overflow-auto rounded-control border border-border p-2">
                  {members.data?.map((m) => (
                    <label
                      key={m.user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={ids.includes(m.user.id)}
                        onChange={(e) =>
                          setIds((x) =>
                            e.target.checked
                              ? [...x, m.user.id]
                              : x.filter((id) => id !== m.user.id),
                          )
                        }
                      />
                      <span>
                        {m.user.email}{' '}
                        <span className="text-text-secondary">({m.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {mode === 'edit'
                ? 'Save changes'
                : mode === 'reschedule'
                  ? 'Reschedule interview'
                  : 'Schedule interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
