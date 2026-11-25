import { motion, useReducedMotion } from 'framer-motion'
import { Flame } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { LedgerMetrics } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import { BentoCard } from '../ui/BentoCard'
import { StatusPill, type StatusPillVariant } from '../ui/StatusPill'

export interface DailyProofBentoCardProps {
  metrics: LedgerMetrics
  currencySymbol: string
  onNavigateAnalytics?: () => void
}

/** Right Middle Bento card displaying today's spend, yesterday delta, streak badge, and daily cap progress. */
export function DailyProofBentoCard({
  metrics,
  currencySymbol,
  onNavigateAnalytics,
}: DailyProofBentoCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const { dailyDelta, dailyLimitProgress, underCapStreak } = metrics
  const { limit, percentUsed, isOverLimit } = dailyLimitProgress

  let pillVariant: StatusPillVariant = 'neutral'
  let pillLabel = 'No spend yet'

  if (dailyDelta.status === 'saved') {
    pillVariant = 'saved'
    pillLabel = `Saved ${formatCurrency(dailyDelta.difference, currencySymbol)}`
  } else if (dailyDelta.status === 'exceeded') {
    pillVariant = 'exceeded'
    pillLabel = `+${formatCurrency(dailyDelta.difference, currencySymbol)} vs yest`
  } else if (metrics.todaySpend > 0) {
    pillVariant = 'neutral'
    pillLabel = 'Same as yest'
  }

  const fillPercent = limit > 0 ? percentUsed : 0

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
      aria-label={onNavigateAnalytics ? 'Open daily proof analytics' : undefined}
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
            Daily Proof
          </h2>
          {underCapStreak > 0 ? (
            <span
              title={`${underCapStreak}-day under-cap streak`}
              className="flex items-center gap-1 text-[11px] font-semibold text-spend-accent num-tabular shrink-0"
            >
              <Flame className="h-3 w-3" aria-hidden="true" />
              {underCapStreak}d
            </span>
          ) : (
            <span className="text-[11px] font-medium text-spend-muted shrink-0">
              Today
            </span>
          )}
        </div>

        <p className="text-xl font-bold tracking-[-0.02em] text-spend-text num-tabular mt-1.5 truncate">
          {formatCurrency(metrics.todaySpend, currencySymbol)}
        </p>

        <div className="mt-2">
          <StatusPill
            variant={pillVariant}
            className="w-fit max-w-full overflow-hidden"
          >
            <span className="truncate">{pillLabel}</span>
          </StatusPill>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-1 text-[11px] num-tabular mb-1.5">
          <span className="text-spend-muted shrink-0">Daily cap</span>
          {limit > 0 ? (
            isOverLimit ? (
              <span className="text-spend-exceeded font-medium shrink-0">
                Over cap
              </span>
            ) : (
              <span className="text-spend-muted shrink-0">
                {Math.round(percentUsed)}%
              </span>
            )
          ) : (
            <span className="text-spend-muted shrink-0">Off</span>
          )}
        </div>

        <div
          role="progressbar"
          aria-label="Daily spending cap progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fillPercent)}
          className="h-1.5 w-full rounded-full bg-spend-raised overflow-hidden"
        >
          <motion.div
            initial={false}
            animate={{ width: `${fillPercent}%` }}
            transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
            className={cn(
              'h-full rounded-full',
              isOverLimit ? 'bg-spend-exceeded' : 'bg-spend-accent',
            )}
          />
        </div>
      </div>
    </BentoCard>
  )
}
