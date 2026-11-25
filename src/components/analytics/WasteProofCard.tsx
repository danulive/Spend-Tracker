import { motion, useReducedMotion } from 'framer-motion'
import type { PeriodAnalyticsSummary } from '../../lib/chartData'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import { BentoCard } from '../ui/BentoCard'
import { StatusPill, type StatusPillVariant } from '../ui/StatusPill'

export interface WasteProofCardProps {
  summary: PeriodAnalyticsSummary
  currencySymbol: string
}

/** Displays Essential vs. Impulse/Wasted spending proof and avoidable spend share. */
export function WasteProofCard({
  summary,
  currencySymbol,
}: WasteProofCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const { totalSpend, essentialSpend, impulseSpend, wastePercentage } = summary

  let pillVariant: StatusPillVariant = 'neutral'
  if (totalSpend > 0) {
    if (wastePercentage <= 15) {
      pillVariant = 'saved'
    } else if (wastePercentage > 35) {
      pillVariant = 'exceeded'
    }
  }

  const essentialPercentage = Math.max(0, 100 - wastePercentage)

  return (
    <BentoCard className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-spend-text">
            Essential vs. Wasted
          </h2>
          <p className="text-xs text-spend-muted mt-0.5">
            Proof of avoidable spending
          </p>
        </div>

        <StatusPill variant={pillVariant} className="shrink-0">
          {totalSpend === 0 ? '0% wasted' : `${wastePercentage}% wasted`}
        </StatusPill>
      </div>

      <div
        role="img"
        aria-label={
          totalSpend === 0
            ? 'No spending recorded'
            : `${essentialPercentage.toFixed(1)}% essential, ${wastePercentage.toFixed(1)}% impulse`
        }
        className="mt-4 h-3 w-full rounded-full bg-spend-raised overflow-hidden flex gap-0.5"
      >
        {totalSpend > 0 && (
          <>
            {essentialPercentage > 0 && (
              <motion.div
                initial={false}
                animate={{ width: `${essentialPercentage}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
                className={cn(
                  'bg-spend-accent h-full rounded-l-full',
                  wastePercentage === 0 && 'rounded-r-full',
                )}
              />
            )}
            {wastePercentage > 0 && (
              <motion.div
                initial={false}
                animate={{ width: `${wastePercentage}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
                className={cn(
                  'bg-spend-exceeded h-full rounded-r-full',
                  essentialPercentage === 0 && 'rounded-l-full',
                )}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-2xl bg-spend-raised/70 border border-spend-text/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-spend-accent shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs text-spend-muted truncate">Essential</span>
          </div>
          <p className="text-base font-bold text-spend-text num-tabular mt-1 truncate">
            {formatCurrency(essentialSpend, currencySymbol)}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl bg-spend-raised/70 border border-spend-text/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-spend-exceeded shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs text-spend-muted truncate">
              Impulse / Wasted
            </span>
          </div>
          <p
            className={cn(
              'text-base font-bold num-tabular mt-1 truncate',
              impulseSpend > 0 ? 'text-spend-exceeded' : 'text-spend-text',
            )}
          >
            {formatCurrency(impulseSpend, currencySymbol)}
          </p>
        </div>
      </div>
    </BentoCard>
  )
}
