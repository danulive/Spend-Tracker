import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { PeriodAnalyticsSummary } from '../../lib/chartData'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import { BentoCard } from '../ui/BentoCard'

export interface SpendTrendChartCardProps {
  summary: PeriodAnalyticsSummary
  currencySymbol: string
  dailyLimit: number
}

/** Interactive Apple Health-inspired bar chart card for Weekly and Monthly spend. */
export function SpendTrendChartCard({
  summary,
  currencySymbol,
  dailyLimit,
}: SpendTrendChartCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const currentBucketId =
    summary.buckets.find((bucket) => bucket.isCurrent)?.id ?? null

  const [selection, setSelection] = useState<{
    period: 'week' | 'month'
    id: string | null
  }>(() => ({
    period: summary.period,
    id: currentBucketId,
  }))

  const selectedBucketId =
    selection.period === summary.period ? selection.id : currentBucketId

  const selectedBucket =
    summary.buckets.find((bucket) => bucket.id === selectedBucketId) ?? null

  const showCapLine = summary.period === 'week' && dailyLimit > 0
  const chartMax = Math.max(
    summary.maxBucketValue,
    showCapLine ? dailyLimit : 0,
    1,
  )

  const capOffsetPercent = showCapLine
    ? Math.min(100, Math.max(0, (dailyLimit / chartMax) * 100))
    : 0

  return (
    <BentoCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted">
            SPENDING TREND
          </p>
          <p className="text-2xl font-bold num-tabular text-spend-text mt-0.5 truncate">
            {formatCurrency(summary.totalSpend, currencySymbol)}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[11px] text-spend-muted">Avg / day</p>
          <p className="text-xs font-semibold text-spend-text num-tabular mt-0.5">
            {formatCurrency(summary.dailyAverage, currencySymbol)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-full bg-spend-raised border border-spend-text/[0.08] px-3.5 py-1.5 text-xs num-tabular flex items-center justify-between gap-2 min-h-[30px]">
        {selectedBucket ? (
          <>
            <span className="text-spend-muted truncate">
              {selectedBucket.fullLabel}
            </span>
            <span className="font-semibold text-spend-text shrink-0">
              {formatCurrency(selectedBucket.total, currencySymbol)}
              {selectedBucket.impulseTotal > 0 && (
                <span className="text-spend-exceeded font-medium">
                  {' '}
                  · Wasted{' '}
                  {formatCurrency(selectedBucket.impulseTotal, currencySymbol)}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="text-spend-muted">Tap any bar to inspect</span>
        )}
      </div>

      <div className="mt-4 h-[156px] lg:h-[210px] relative flex items-end justify-between gap-2 pt-4 pb-1">
        {showCapLine && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[28px] h-[112px] lg:h-[166px]"
          >
            <div
              style={{ bottom: `${capOffsetPercent}%` }}
              className="border-t border-dashed border-spend-muted/40 absolute inset-x-0 flex justify-end"
            >
              <span className="text-[10px] text-spend-muted bg-spend-surface px-1 -mt-2 rounded">
                Cap
              </span>
            </div>
          </div>
        )}

        {summary.buckets.map((bucket) => {
          const isSelected = bucket.id === selectedBucketId
          const isActive = isSelected || bucket.isCurrent
          const isOverCap =
            showCapLine && bucket.total > 0 && bucket.total > dailyLimit

          const heightValue =
            bucket.total === 0
              ? '4px'
              : `${Math.max(6, (bucket.total / chartMax) * 100)}%`

          const barColorClass =
            bucket.total === 0
              ? 'bg-spend-text/[0.08]'
              : isOverCap
                ? 'bg-spend-exceeded'
                : isActive
                  ? 'bg-spend-accent'
                  : 'bg-spend-text/75 group-hover:bg-spend-text'

          return (
            <button
              key={bucket.id}
              type="button"
              aria-label={`${bucket.fullLabel}: ${formatCurrency(bucket.total, currencySymbol)}`}
              aria-pressed={isSelected}
              onClick={() =>
                setSelection({
                  period: summary.period,
                  id: isSelected ? null : bucket.id,
                })
              }
              className="flex-1 flex flex-col items-center h-full justify-end gap-2 group focus-visible:outline-none"
            >
              <div className="w-full max-w-[30px] lg:max-w-[44px] h-[112px] lg:h-[166px] rounded-t-[10px] rounded-b-[6px] bg-spend-raised/60 flex items-end overflow-hidden relative group-focus-visible:ring-2 group-focus-visible:ring-spend-accent">
                <motion.div
                  initial={false}
                  animate={{ height: heightValue }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : APPLE_SPRING
                  }
                  className={cn(
                    'w-full rounded-t-[10px] rounded-b-[6px] transition-colors',
                    barColorClass,
                  )}
                />
              </div>
              <span
                className={cn(
                  'h-4 leading-4 text-[11px] font-medium num-tabular',
                  isActive
                    ? 'text-spend-accent font-semibold'
                    : 'text-spend-muted',
                )}
              >
                {bucket.label}
              </span>
            </button>
          )
        })}
      </div>
    </BentoCard>
  )
}
