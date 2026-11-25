import { useState, type KeyboardEvent } from 'react'
import type { LedgerMetrics } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { BentoCard } from '../ui/BentoCard'
import { SegmentedCategoryBar } from './SegmentedCategoryBar'

export interface SpendingBentoCardProps {
  metrics: LedgerMetrics
  currencySymbol: string
  onNavigateAnalytics?: () => void
}

type SpendingPeriod = 'month' | 'week'

const monthNameFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' })

/** Left Middle Bento card showing weekly/monthly spend, category bar, and impulse waste. */
export function SpendingBentoCard({
  metrics,
  currencySymbol,
  onNavigateAnalytics,
}: SpendingBentoCardProps) {
  const [period, setPeriod] = useState<SpendingPeriod>('month')
  const [currentLocalMonthName] = useState(() =>
    monthNameFormatter.format(new Date()),
  )
  const activeTotal =
    period === 'month' ? metrics.monthlySpend : metrics.weeklySpend
  const activeBreakdown =
    period === 'month' ? metrics.monthlyBreakdown : metrics.weeklyBreakdown
  const activeImpulseTotal =
    period === 'month'
      ? metrics.monthlyImpulseSpend
      : metrics.weeklyImpulseSpend

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onNavigateAnalytics || event.target !== event.currentTarget) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onNavigateAnalytics()
    }
  }

  return (
    <BentoCard
      role={onNavigateAnalytics ? 'button' : undefined}
      tabIndex={onNavigateAnalytics ? 0 : undefined}
      aria-label={onNavigateAnalytics ? 'Open spending analytics' : undefined}
      onClick={onNavigateAnalytics}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'p-4 flex flex-col justify-between min-h-[176px] min-w-0',
        onNavigateAnalytics &&
          'cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-spend-text truncate">
            Spending
          </h2>

          <div
            role="group"
            aria-label="Spending period"
            className="inline-flex shrink-0 items-center rounded-full bg-spend-raised p-0.5 border border-spend-text/[0.08]"
          >
            <button
              type="button"
              aria-label="Weekly spending"
              aria-pressed={period === 'week'}
              onClick={(event) => {
                event.stopPropagation()
                setPeriod('week')
              }}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] leading-tight transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                period === 'week'
                  ? 'bg-spend-accent text-spend-bg font-semibold'
                  : 'text-spend-muted hover:text-spend-text',
              )}
            >
              W
            </button>
            <button
              type="button"
              aria-label="Monthly spending"
              aria-pressed={period === 'month'}
              onClick={(event) => {
                event.stopPropagation()
                setPeriod('month')
              }}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] leading-tight transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                period === 'month'
                  ? 'bg-spend-accent text-spend-bg font-semibold'
                  : 'text-spend-muted hover:text-spend-text',
              )}
            >
              M
            </button>
          </div>
        </div>

        <p className="text-xs text-spend-muted mt-1 truncate">
          {period === 'month'
            ? `Spent in ${currentLocalMonthName}`
            : 'Spent this week'}
        </p>

        <p className="text-xl font-bold tracking-[-0.02em] text-spend-text num-tabular mt-1.5 truncate">
          {formatCurrency(activeTotal, currencySymbol)}
        </p>
      </div>

      <div>
        <SegmentedCategoryBar slices={activeBreakdown} className="mt-3" />

        <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] num-tabular">
          <span className="text-spend-muted shrink-0">Wasted</span>
          <span
            className={cn(
              'truncate font-medium',
              activeImpulseTotal > 0
                ? 'text-spend-exceeded'
                : 'text-spend-muted',
            )}
          >
            {formatCurrency(activeImpulseTotal, currencySymbol)}
          </span>
        </div>
      </div>
    </BentoCard>
  )
}
