import type { CategorySlice, LedgerMetrics } from './analytics'
import {
  getLocalDateKey,
  getStartOfLocalWeek,
  isThisMonth,
} from './date'
import { roundMoney } from './format'
import type { LedgerData, Transaction } from '../types/ledger'

export interface SpendBarBucket {
  id: string
  label: string
  fullLabel: string
  total: number
  impulseTotal: number
  essentialTotal: number
  count: number
  isCurrent: boolean
}

export interface PeriodAnalyticsSummary {
  period: 'week' | 'month'
  periodTitle: string
  totalSpend: number
  essentialSpend: number
  impulseSpend: number
  wastePercentage: number
  dailyAverage: number
  transactionCount: number
  buckets: SpendBarBucket[]
  maxBucketValue: number
  breakdown: CategorySlice[]
}

const shortWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})

const fullWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const shortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
})

const monthYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

/**
 * Builds 7 Monday-through-Sunday local-timezone buckets for the week containing `now`.
 */
export function buildWeeklyBuckets(
  transactions: Transaction[],
  now: Date = new Date(),
): SpendBarBucket[] {
  const weekStart = getStartOfLocalWeek(now)
  const todayKey = getLocalDateKey(now)
  const buckets: SpendBarBucket[] = []
  const indexByKey = new Map<string, number>()

  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + i,
      0,
      0,
      0,
      0,
    )
    const dateKey = getLocalDateKey(dayDate)
    indexByKey.set(dateKey, i)
    buckets.push({
      id: dateKey,
      label: shortWeekdayFormatter.format(dayDate),
      fullLabel: fullWeekdayFormatter.format(dayDate),
      total: 0,
      impulseTotal: 0,
      essentialTotal: 0,
      count: 0,
      isCurrent: dateKey === todayKey,
    })
  }

  for (const tx of transactions) {
    const amount = roundMoney(tx.amount)
    if (amount <= 0) {
      continue
    }

    const txKey = getLocalDateKey(tx.timestamp)
    const idx = indexByKey.get(txKey)
    if (idx === undefined) {
      continue
    }

    const bucket = buckets[idx]
    bucket.total = roundMoney(bucket.total + amount)
    if (tx.isImpulse) {
      bucket.impulseTotal = roundMoney(bucket.impulseTotal + amount)
    } else {
      bucket.essentialTotal = roundMoney(bucket.essentialTotal + amount)
    }
    bucket.count += 1
  }

  return buckets
}

/**
 * Groups current local month transactions into calendar-day week buckets (W1–W4/W5).
 */
export function buildMonthlyBuckets(
  transactions: Transaction[],
  now: Date = new Date(),
): SpendBarBucket[] {
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthShort = shortMonthFormatter.format(now)
  const todayDate = now.getDate()

  const ranges: Array<{ label: string; start: number; end: number }> = [
    { label: 'W1', start: 1, end: 7 },
    { label: 'W2', start: 8, end: 14 },
    { label: 'W3', start: 15, end: 21 },
    { label: 'W4', start: 22, end: 28 },
  ]

  if (daysInMonth > 28) {
    ranges.push({ label: 'W5', start: 29, end: daysInMonth })
  }

  const buckets: SpendBarBucket[] = ranges.map((range) => ({
    id: `${year}-${String(month + 1).padStart(2, '0')}-${range.label}`,
    label: range.label,
    fullLabel:
      range.start === range.end
        ? `${monthShort} ${range.start}`
        : `${monthShort} ${range.start} – ${monthShort} ${range.end}`,
    total: 0,
    impulseTotal: 0,
    essentialTotal: 0,
    count: 0,
    isCurrent: todayDate >= range.start && todayDate <= range.end,
  }))

  for (const tx of transactions) {
    const amount = roundMoney(tx.amount)
    if (amount <= 0 || !isThisMonth(tx.timestamp, now)) {
      continue
    }

    const localKey = getLocalDateKey(tx.timestamp)
    const dayOfMonth = Number(localKey.slice(8, 10))
    if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1) {
      continue
    }

    const bucketIndex = Math.min(
      Math.floor((dayOfMonth - 1) / 7),
      buckets.length - 1,
    )
    const bucket = buckets[bucketIndex]
    bucket.total = roundMoney(bucket.total + amount)
    if (tx.isImpulse) {
      bucket.impulseTotal = roundMoney(bucket.impulseTotal + amount)
    } else {
      bucket.essentialTotal = roundMoney(bucket.essentialTotal + amount)
    }
    bucket.count += 1
  }

  return buckets
}

/**
 * Aggregates period totals, waste ratio, daily average, trend buckets, and category slices.
 */
export function computePeriodAnalytics(
  ledger: LedgerData,
  metrics: LedgerMetrics,
  period: 'week' | 'month',
  now: Date = new Date(),
): PeriodAnalyticsSummary {
  const totalSpend =
    period === 'week' ? metrics.weeklySpend : metrics.monthlySpend
  const impulseSpend =
    period === 'week'
      ? metrics.weeklyImpulseSpend
      : metrics.monthlyImpulseSpend
  const essentialSpend = roundMoney(Math.max(0, totalSpend - impulseSpend))

  const wastePercentage =
    totalSpend > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((impulseSpend / totalSpend) * 1000) / 10),
        )
      : 0

  const buckets =
    period === 'week'
      ? buildWeeklyBuckets(ledger.transactions, now)
      : buildMonthlyBuckets(ledger.transactions, now)

  const transactionCount = buckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  )
  const maxBucketValue = buckets.reduce(
    (max, bucket) => Math.max(max, bucket.total),
    0,
  )

  const daysElapsed =
    period === 'week'
      ? ((now.getDay() + 6) % 7) + 1
      : Math.max(1, now.getDate())

  const dailyAverage = roundMoney(totalSpend / daysElapsed)
  const breakdown =
    period === 'week' ? metrics.weeklyBreakdown : metrics.monthlyBreakdown

  return {
    period,
    periodTitle:
      period === 'week' ? 'This Week' : monthYearFormatter.format(now),
    totalSpend,
    essentialSpend,
    impulseSpend,
    wastePercentage,
    dailyAverage,
    transactionCount,
    buckets,
    maxBucketValue,
    breakdown,
  }
}
