import { CATEGORIES, CATEGORY_MAP } from '../constants/categories'
import type { CategoryId, LedgerData, Transaction } from '../types/ledger'
import {
  getLocalDateKey,
  isThisMonth,
  isThisWeek,
  isToday,
  isYesterday,
} from './date'
import { roundMoney } from './format'

export interface DailyDeltaResult {
  todaySpend: number
  yesterdaySpend: number
  /** Positive absolute difference between todaySpend and yesterdaySpend. */
  difference: number
  status: 'saved' | 'exceeded' | 'even'
}

export interface CategorySlice {
  category: CategoryId
  total: number
  /** Share of period spending from 0 to 100, rounded to 1 decimal place. */
  percentage: number
  count: number
}

export interface DailyLimitProgress {
  limit: number
  spentToday: number
  /** Remaining allowance; negative when spentToday exceeds limit. */
  remaining: number
  /** Clamped 0 to 100 for bar width rendering. */
  percentUsed: number
  isOverLimit: boolean
}

export interface LedgerMetrics {
  todaySpend: number
  yesterdaySpend: number
  weeklySpend: number
  monthlySpend: number
  todayImpulseSpend: number
  weeklyImpulseSpend: number
  monthlyImpulseSpend: number
  dailyDelta: DailyDeltaResult
  dailyLimitProgress: DailyLimitProgress
  underCapStreak: number
  weeklyBreakdown: CategorySlice[]
  monthlyBreakdown: CategorySlice[]
}

interface CategoryBucket {
  total: number
  count: number
}

function createEmptyBuckets(): Record<CategoryId, CategoryBucket> {
  return {
    food: { total: 0, count: 0 },
    transport: { total: 0, count: 0 },
    bills: { total: 0, count: 0 },
    shopping: { total: 0, count: 0 },
    other: { total: 0, count: 0 },
  }
}

function buildBreakdown(
  buckets: Record<CategoryId, CategoryBucket>,
  periodTotal: number,
): CategorySlice[] {
  const slices: CategorySlice[] = []

  for (const meta of CATEGORIES) {
    const bucket = buckets[meta.id]
    const total = roundMoney(bucket.total)
    if (total <= 0) {
      continue
    }

    const percentage =
      periodTotal > 0
        ? Math.min(100, Math.max(0, Math.round((total / periodTotal) * 1000) / 10))
        : 0

    slices.push({
      category: meta.id,
      total,
      percentage,
      count: bucket.count,
    })
  }

  return slices.sort((a, b) => b.total - a.total)
}

/**
 * Computes all spend totals, daily delta, daily limit progress, and category breakdowns
 * in a single deterministic pass using the user's local timezone.
 */
export function computeLedgerMetrics(
  ledger: LedgerData,
  now: Date = new Date(),
): LedgerMetrics {
  let todaySpend = 0
  let yesterdaySpend = 0
  let weeklySpend = 0
  let monthlySpend = 0
  let todayImpulseSpend = 0
  let weeklyImpulseSpend = 0
  let monthlyImpulseSpend = 0

  const weeklyBuckets = createEmptyBuckets()
  const monthlyBuckets = createEmptyBuckets()
  const dailyTotals = new Map<string, number>()
  let earliestDateKey = ''

  for (const tx of ledger.transactions) {
    const amount = roundMoney(tx.amount)
    if (amount <= 0) {
      continue
    }

    const dayKey = getLocalDateKey(tx.timestamp)
    if (dayKey) {
      dailyTotals.set(dayKey, roundMoney((dailyTotals.get(dayKey) ?? 0) + amount))
      if (!earliestDateKey || dayKey < earliestDateKey) {
        earliestDateKey = dayKey
      }
    }

    if (isToday(tx.timestamp, now)) {
      todaySpend = roundMoney(todaySpend + amount)
      if (tx.isImpulse) {
        todayImpulseSpend = roundMoney(todayImpulseSpend + amount)
      }
    }

    if (isYesterday(tx.timestamp, now)) {
      yesterdaySpend = roundMoney(yesterdaySpend + amount)
    }

    if (isThisWeek(tx.timestamp, now)) {
      weeklySpend = roundMoney(weeklySpend + amount)
      if (tx.isImpulse) {
        weeklyImpulseSpend = roundMoney(weeklyImpulseSpend + amount)
      }
      const bucket = weeklyBuckets[tx.category]
      bucket.total = roundMoney(bucket.total + amount)
      bucket.count += 1
    }

    if (isThisMonth(tx.timestamp, now)) {
      monthlySpend = roundMoney(monthlySpend + amount)
      if (tx.isImpulse) {
        monthlyImpulseSpend = roundMoney(monthlyImpulseSpend + amount)
      }
      const bucket = monthlyBuckets[tx.category]
      bucket.total = roundMoney(bucket.total + amount)
      bucket.count += 1
    }
  }

  const difference = roundMoney(Math.abs(todaySpend - yesterdaySpend))
  const status: DailyDeltaResult['status'] =
    todaySpend < yesterdaySpend
      ? 'saved'
      : todaySpend > yesterdaySpend
        ? 'exceeded'
        : 'even'

  const limit =
    Number.isFinite(ledger.settings.dailyLimit) && ledger.settings.dailyLimit > 0
      ? roundMoney(ledger.settings.dailyLimit)
      : 0

  const dailyLimitProgress: DailyLimitProgress =
    limit > 0
      ? {
          limit,
          spentToday: todaySpend,
          remaining: roundMoney(limit - todaySpend),
          percentUsed: Math.min(
            100,
            Math.max(0, Math.round((todaySpend / limit) * 1000) / 10),
          ),
          isOverLimit: todaySpend > limit,
        }
      : {
          limit: 0,
          spentToday: todaySpend,
          remaining: 0,
          percentUsed: 0,
          isOverLimit: false,
        }

  let underCapStreak = 0
  if (limit > 0 && earliestDateKey) {
    for (let offset = 0; offset < 365; offset += 1) {
      const checkDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - offset,
        0,
        0,
        0,
        0,
      )
      const checkKey = getLocalDateKey(checkDate)
      if (!checkKey || checkKey < earliestDateKey) {
        break
      }
      const daySpend = dailyTotals.get(checkKey) ?? 0
      if (daySpend <= limit) {
        underCapStreak += 1
      } else {
        break
      }
    }
  }

  return {
    todaySpend,
    yesterdaySpend,
    weeklySpend,
    monthlySpend,
    todayImpulseSpend,
    weeklyImpulseSpend,
    monthlyImpulseSpend,
    dailyDelta: {
      todaySpend,
      yesterdaySpend,
      difference,
      status,
    },
    dailyLimitProgress,
    underCapStreak,
    weeklyBreakdown: buildBreakdown(weeklyBuckets, weeklySpend),
    monthlyBreakdown: buildBreakdown(monthlyBuckets, monthlySpend),
  }
}

/**
 * Filters transactions by category and case-insensitive search query against note
 * and category labels, returning a new array sorted newest-first by timestamp.
 */
export function filterTransactions(
  transactions: Transaction[],
  query: string,
  category: CategoryId | 'all' = 'all',
): Transaction[] {
  const normalizedQuery = query.trim().toLowerCase()

  return transactions
    .filter((tx) => {
      if (category !== 'all' && tx.category !== category) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const meta = CATEGORY_MAP[tx.category]
      return (
        tx.note.toLowerCase().includes(normalizedQuery) ||
        meta.label.toLowerCase().includes(normalizedQuery) ||
        meta.shortLabel.toLowerCase().includes(normalizedQuery)
      )
    })
    .sort((a, b) => {
      const diff = Date.parse(b.timestamp) - Date.parse(a.timestamp)
      return Number.isNaN(diff) ? 0 : diff
    })
}
