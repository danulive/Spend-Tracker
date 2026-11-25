import { useMemo, useState } from 'react'
import { useLedger } from '../../context/LedgerContext'
import { computePeriodAnalytics } from '../../lib/chartData'
import { cn } from '../../lib/cn'
import { CategoryBreakdownCard } from '../analytics/CategoryBreakdownCard'
import { SpendTrendChartCard } from '../analytics/SpendTrendChartCard'
import { WasteProofCard } from '../analytics/WasteProofCard'

type AnalyticsPeriod = 'week' | 'month'

/** Analytics tab presenting Weekly/Monthly spend trends, waste proof, and category breakdown. */
export function AnalyticsScreen() {
  const { ledger, metrics } = useLedger()
  const [period, setPeriod] = useState<AnalyticsPeriod>('week')

  const summary = useMemo(
    () => computePeriodAnalytics(ledger, metrics, period),
    [ledger, metrics, period],
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-spend-text">
            Analytics
          </h1>
          <p className="text-xs text-spend-muted truncate">
            {summary.periodTitle}
          </p>
        </div>

        <div
          role="group"
          aria-label="Analytics period"
          className="rounded-full bg-spend-raised p-1 border border-spend-text/[0.10] inline-flex shrink-0"
        >
          <button
            type="button"
            aria-pressed={period === 'week'}
            onClick={() => setPeriod('week')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
              period === 'week'
                ? 'bg-spend-accent text-spend-bg font-semibold'
                : 'text-spend-muted hover:text-spend-text',
            )}
          >
            Weekly
          </button>
          <button
            type="button"
            aria-pressed={period === 'month'}
            onClick={() => setPeriod('month')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
              period === 'month'
                ? 'bg-spend-accent text-spend-bg font-semibold'
                : 'text-spend-muted hover:text-spend-text',
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="space-y-3.5">
        <SpendTrendChartCard
          summary={summary}
          currencySymbol={ledger.settings.currencySymbol}
          dailyLimit={ledger.settings.dailyLimit}
        />
        <WasteProofCard
          summary={summary}
          currencySymbol={ledger.settings.currencySymbol}
        />
        <CategoryBreakdownCard
          slices={summary.breakdown}
          currencySymbol={ledger.settings.currencySymbol}
          periodTitle={summary.periodTitle}
        />
      </div>
    </div>
  )
}
