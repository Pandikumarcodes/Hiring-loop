import { describe, expect, test } from 'vitest'
import { dateInput, localInZoneToIso, timeInput } from './interview-utils'

describe('interview timezone conversion', () => {
  test('converts Asia/Kolkata local time to the expected instant', () => {
    expect(localInZoneToIso('2026-06-15', '10:30', 'Asia/Kolkata')).toBe(
      '2026-06-15T05:00:00.000Z',
    )
  })

  test('round-trips a DST-aware America/New_York interview for rescheduling', () => {
    const iso = localInZoneToIso('2026-07-15', '09:30', 'America/New_York')
    expect(iso).toBe('2026-07-15T13:30:00.000Z')
    expect(dateInput(iso, 'America/New_York')).toBe('2026-07-15')
    expect(timeInput(iso, 'America/New_York')).toBe('09:30')
  })
})
