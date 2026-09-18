import { describe, expect, test } from 'vitest'
import {
  calendarEndUtc,
  calendarStartUtc,
  formatDuration,
  formatPercent,
} from './analytics-utils'

describe('analytics date and metric utilities', () => {
  test('emits strict UTC RFC3339 calendar boundaries independent of local time', () => {
    expect(calendarStartUtc('2026-01-15')).toBe('2026-01-15T00:00:00.000Z')
    expect(calendarEndUtc('2026-01-15')).toBe('2026-01-16T00:00:00.000Z')
  })

  test('formats null durations and server-provided rates safely', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(432000)).toBe('5.0 days')
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(0.625)).toBe('62.5%')
  })
})
