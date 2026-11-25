import { CATEGORY_MAP } from '../constants/categories'
import type { Transaction, WalletAdjustment } from '../types/ledger'
import {
  formatPaymentTime,
  formatRelativeDayLabel,
  getLocalDateKey,
} from './date'
import { roundMoney } from './format'

export interface DayTransactionGroup {
  dateKey: string
  label: string
  dayTotal: number
  items: Transaction[]
}

const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

const monthKeyFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

/** Returns "YYYY-MM" strictly in the device's local timezone. */
export function getLocalMonthKey(input: string | Date): string {
  const dateKey = getLocalDateKey(input)
  return dateKey ? dateKey.slice(0, 7) : ''
}

/** Collects unique local "YYYY-MM" keys sorted newest-first, always including `now`. */
export function getAvailableMonthKeys(
  transactions: Transaction[],
  adjustments: WalletAdjustment[],
  now: Date = new Date(),
): string[] {
  const keys = new Set<string>()
  const currentKey = getLocalMonthKey(now)
  if (currentKey) {
    keys.add(currentKey)
  }

  for (const tx of transactions) {
    const key = getLocalMonthKey(tx.timestamp)
    if (key) {
      keys.add(key)
    }
  }

  for (const adj of adjustments) {
    const key = getLocalMonthKey(adj.timestamp)
    if (key) {
      keys.add(key)
    }
  }

  return Array.from(keys).sort((a, b) => b.localeCompare(a))
}

/** Formats "2026-11" as "Nov 2026" (or "All Time" when key is "all"). */
export function formatMonthKeyLabel(monthKey: string): string {
  if (monthKey === 'all') {
    return 'All Time'
  }

  const match = MONTH_KEY_RE.exec(monthKey)
  if (!match) {
    return monthKey
  }

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const date = new Date(year, month, 1, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? monthKey : monthKeyFormatter.format(date)
}

/** Groups already-sorted transactions by local YYYY-MM-DD day preserving newest-first order. */
export function groupTransactionsByLocalDay(
  transactions: Transaction[],
  now: Date = new Date(),
): DayTransactionGroup[] {
  const groups = new Map<string, DayTransactionGroup>()

  for (const tx of transactions) {
    const dateKey = getLocalDateKey(tx.timestamp)
    if (!dateKey) {
      continue
    }

    const amount = roundMoney(tx.amount)
    const existing = groups.get(dateKey)
    if (existing) {
      existing.dayTotal = roundMoney(existing.dayTotal + amount)
      existing.items.push(tx)
    } else {
      groups.set(dateKey, {
        dateKey,
        label: formatRelativeDayLabel(tx.timestamp, now),
        dayTotal: amount,
        items: [tx],
      })
    }
  }

  return Array.from(groups.values())
}

function escapeCsvCell(value: string, sanitizeFormula = false): string {
  let safe = value
  if (sanitizeFormula && /^[=+\-@]/.test(safe.trimStart())) {
    safe = `'${safe}`
  }

  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }

  return safe
}

/**
 * Generates an RFC 4180 CSV statement with UTF-8 BOM, formula-injection protection,
 * and monthly spend summary footer rows.
 */
export function buildMonthlyProofCsv(
  transactions: Transaction[],
  periodLabel: string,
  currencyCode: string,
): string {
  const sorted = [...transactions].sort((a, b) => {
    const diff = Date.parse(b.timestamp) - Date.parse(a.timestamp)
    return Number.isNaN(diff) ? 0 : diff
  })

  let totalSpend = 0
  let essentialSpend = 0
  let impulseSpend = 0

  const header = [
    'Date',
    'Time',
    'Category',
    'Type',
    'Note',
    `Amount (${currencyCode})`,
  ]
    .map((cell) => escapeCsvCell(cell))
    .join(',')

  const rows = sorted.map((tx) => {
    const amount = roundMoney(tx.amount)
    totalSpend = roundMoney(totalSpend + amount)
    if (tx.isImpulse) {
      impulseSpend = roundMoney(impulseSpend + amount)
    } else {
      essentialSpend = roundMoney(essentialSpend + amount)
    }

    return [
      escapeCsvCell(getLocalDateKey(tx.timestamp)),
      escapeCsvCell(formatPaymentTime(tx.timestamp)),
      escapeCsvCell(CATEGORY_MAP[tx.category].label),
      escapeCsvCell(tx.isImpulse ? 'Impulse (Wasted)' : 'Essential'),
      escapeCsvCell(tx.note, true),
      escapeCsvCell(amount.toFixed(2)),
    ].join(',')
  })

  const summaryRows = [
    `Summary Period,${escapeCsvCell(periodLabel, true)}`,
    `Total Spend,${totalSpend.toFixed(2)}`,
    `Essential Spend,${essentialSpend.toFixed(2)}`,
    `Impulse / Wasted Spend,${impulseSpend.toFixed(2)}`,
  ]

  return `\uFEFF${[header, ...rows, '', ...summaryRows].join('\r\n')}`
}

/** Triggers a browser file download for the supplied CSV string and cleans up the object URL. */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
