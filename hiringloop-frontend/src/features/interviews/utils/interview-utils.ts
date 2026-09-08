import type { InterviewDto } from '../types/interview.types'
export const browserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const parts = (iso: string, tz: string) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>
export const dateInput = (iso: string, tz: string) => {
  const p = parts(iso, tz)
  return `${p.year}-${p.month}-${p.day}`
}
export const timeInput = (iso: string, tz: string) => {
  const p = parts(iso, tz)
  return `${p.hour}:${p.minute}`
}
export function localInZoneToIso(date: string, time: string, timeZone: string) {
  const [y, m, d] = date.split('-').map(Number),
    [h, min] = time.split(':').map(Number)
  let guess = Date.UTC(y, m - 1, d, h, min)
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess).toISOString(), timeZone)
    const actual = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
    guess += Date.UTC(y, m - 1, d, h, min) - actual
  }
  return new Date(guess).toISOString()
}
export function interviewTime(i: InterviewDto) {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: i.timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(i.scheduledStartAt))
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: i.timeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time.format(new Date(i.scheduledStartAt))} – ${time.format(new Date(i.scheduledEndAt))} · ${i.timeZone}`
}
export const duration = (i: InterviewDto) =>
  Math.round(
    (Date.parse(i.scheduledEndAt) - Date.parse(i.scheduledStartAt)) / 60000,
  )
export const safeMeetingUrl = (v: string | null) => {
  try {
    const u = new URL(v ?? '')
    return ['http:', 'https:'].includes(u.protocol) ? u.href : undefined
  } catch {
    return undefined
  }
}
