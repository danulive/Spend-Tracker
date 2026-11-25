import { ArrowDownLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatPaymentDateTime } from '../../lib/date'
import { formatCurrency } from '../../lib/format'
import type { WalletAdjustment } from '../../types/ledger'

export interface WalletAdjustmentRowProps {
  adjustment: WalletAdjustment
  currencySymbol: string
  onSelect: (adjustment: WalletAdjustment) => void
}

/** Interactive audit row displaying manual wallet top-up or balance override transitions. */
export function WalletAdjustmentRow({
  adjustment,
  currencySymbol,
  onSelect,
}: WalletAdjustmentRowProps) {
  const isPositive = adjustment.delta >= 0
  const title =
    adjustment.note ||
    (adjustment.type === 'add' ? 'Manual Top-Up' : 'Balance Override')

  return (
    <button
      type="button"
      onClick={() => onSelect(adjustment)}
      className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-[18px] text-left hover:bg-spend-raised/70 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-2xl bg-spend-raised border border-spend-text/[0.08] flex items-center justify-center shrink-0">
          {adjustment.type === 'add' ? (
            <ArrowDownLeft
              className="h-4 w-4 text-spend-accent"
              aria-hidden="true"
            />
          ) : (
            <SlidersHorizontal
              className={cn(
                'h-4 w-4',
                isPositive ? 'text-spend-accent' : 'text-spend-exceeded',
              )}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-medium text-spend-text truncate">
            {title}
          </p>
          <p className="text-xs text-spend-muted num-tabular truncate mt-0.5">
            {formatCurrency(adjustment.previousBalance, currencySymbol)} →{' '}
            {formatCurrency(adjustment.newBalance, currencySymbol)}
          </p>
          <p className="text-[11px] text-spend-muted/80 num-tabular mt-0.5 truncate">
            {formatPaymentDateTime(adjustment.timestamp)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          <p
            className={cn(
              'text-[15px] font-semibold num-tabular',
              isPositive ? 'text-spend-accent' : 'text-spend-exceeded',
            )}
          >
            {formatCurrency(adjustment.delta, currencySymbol, { showSign: true })}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-spend-muted mt-0.5">
            {adjustment.type === 'add' ? 'Top-Up' : 'Set'}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 text-spend-muted/60"
          aria-hidden="true"
        />
      </div>
    </button>
  )
}
