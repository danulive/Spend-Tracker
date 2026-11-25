const standardMoneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactMoneyFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Rounds monetary values to 2 decimal places while guarding against IEEE-754 drift. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const sign = value < 0 ? -1 : 1
  const rounded =
    (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100

  return Object.is(rounded, -0) ? 0 : rounded
}

export interface FormatCurrencyOptions {
  showSign?: boolean
  compact?: boolean
}

/** Formats a numeric amount with currency symbol, thousands separators, and clean sign handling. */
export function formatCurrency(
  amount: number,
  symbol: string,
  options?: FormatCurrencyOptions,
): string {
  const rounded = roundMoney(amount)
  const absValue = Math.abs(rounded)
  const sign =
    rounded < 0 ? '-' : options?.showSign && rounded > 0 ? '+' : ''
  const spacer = symbol.endsWith('.') || /[A-Za-z]$/.test(symbol) ? ' ' : ''
  const formattedNumber = options?.compact
    ? compactMoneyFormatter.format(absValue)
    : standardMoneyFormatter.format(absValue)

  return `${sign}${symbol}${spacer}${formattedNumber}`
}

/** Generates a collision-resistant identifier with an optional prefix. */
export function generateId(prefix?: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  const trimmedPrefix = prefix?.trim()
  return trimmedPrefix ? `${trimmedPrefix}_${raw}` : raw
}
