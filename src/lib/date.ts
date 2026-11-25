const LOCAL_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

/**
 * Parses a Date or timestamp string into a local Date instance.
 * Date-only YYYY-MM-DD strings are interpreted in the local timezone rather than UTC.
 */
function parseLocalDate(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getTime())
  }

  if (typeof input !== 'string') {
    return null
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const dateKeyMatch = LOCAL_DATE_KEY_RE.exec(trimmed)
  if (dateKeyMatch) {
    const year = Number(dateKeyMatch[1])
    const month = Number(dateKeyMatch[2]) - 1
    const day = Number(dateKeyMatch[3])
    const localDate = new Date(year, month, day, 0, 0, 0, 0)
    return Number.isNaN(localDate.getTime()) ? null : localDate
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Returns "YYYY-MM-DD" in the device's local timezone (never UTC). */
export function getLocalDateKey(input: string | Date): string {
  const date = parseLocalDate(input)
  if (!date) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Returns a Date set to 00:00:00.000 in the local timezone. */
export function getStartOfLocalDay(date: Date = new Date()): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  )
}

/** Returns Monday 00:00:00.000 of the local week containing `date`. */
export function getStartOfLocalWeek(date: Date = new Date()): Date {
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6 offset.
  const daysFromMonday = (date.getDay() + 6) % 7
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysFromMonday,
    0,
    0,
    0,
    0,
  )
}

/** Returns the 1st of the local month at 00:00:00.000. */
export function getStartOfLocalMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

/** Returns true when two timestamps fall on the same local calendar day. */
export function isSameLocalDay(a: string | Date, b: string | Date): boolean {
  const da = parseLocalDate(a)
  const db = parseLocalDate(b)
  if (!da || !db) {
    return false
  }

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

/** Returns true when `isoTimestamp` occurs on the same local day as `now`. */
export function isToday(isoTimestamp: string, now: Date = new Date()): boolean {
  return isSameLocalDay(isoTimestamp, now)
}

/** Returns true when `isoTimestamp` occurs on the local calendar day before `now`. */
export function isYesterday(
  isoTimestamp: string,
  now: Date = new Date(),
): boolean {
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    0,
    0,
    0,
    0,
  )
  return isSameLocalDay(isoTimestamp, yesterday)
}

/** Returns true when `isoTimestamp` falls within the Monday-Sunday local week of `now`. */
export function isThisWeek(
  isoTimestamp: string,
  now: Date = new Date(),
): boolean {
  const target = parseLocalDate(isoTimestamp)
  if (!target) {
    return false
  }

  const weekStart = getStartOfLocalWeek(now)
  const nextWeekStart = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 7,
    0,
    0,
    0,
    0,
  )

  return (
    target.getTime() >= weekStart.getTime() &&
    target.getTime() < nextWeekStart.getTime()
  )
}

/** Returns true when `isoTimestamp` falls in the same local year and month as `now`. */
export function isThisMonth(
  isoTimestamp: string,
  now: Date = new Date(),
): boolean {
  const target = parseLocalDate(isoTimestamp)
  if (!target) {
    return false
  }

  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth()
  )
}

/** Formats an ISO timestamp as a local clock time, e.g. "4:41 PM". */
export function formatPaymentTime(isoTimestamp: string): string {
  const date = parseLocalDate(isoTimestamp)
  if (!date) {
    return ''
  }

  return timeFormatter.format(date)
}

/** Formats an ISO timestamp as local date and time, e.g. "Nov 25, 2026 · 4:41 PM". */
export function formatPaymentDateTime(isoTimestamp: string): string {
  const date = parseLocalDate(isoTimestamp)
  if (!date) {
    return ''
  }

  return `${dateWithYearFormatter.format(date)} · ${timeFormatter.format(date)}`
}

/** Formats a relative local day label: "Today", "Yesterday", "Nov 23", or "Nov 23, 2025". */
export function formatRelativeDayLabel(
  isoTimestamp: string,
  now: Date = new Date(),
): string {
  const date = parseLocalDate(isoTimestamp)
  if (!date) {
    return ''
  }

  if (isToday(isoTimestamp, now)) {
    return 'Today'
  }

  if (isYesterday(isoTimestamp, now)) {
    return 'Yesterday'
  }

  if (date.getFullYear() === now.getFullYear()) {
    return shortDateFormatter.format(date)
  }

  return dateWithYearFormatter.format(date)
}
