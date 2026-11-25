import { ChevronRight } from 'lucide-react'
import { CATEGORY_MAP } from '../../constants/categories'
import { cn } from '../../lib/cn'
import { formatPaymentTime, formatRelativeDayLabel } from '../../lib/date'
import { formatCurrency } from '../../lib/format'
import type { Transaction } from '../../types/ledger'
import { CategoryIcon } from '../ui/CategoryIcon'

export interface TransactionRowProps {
  transaction: Transaction
  currencySymbol: string
  onSelect: (transaction: Transaction) => void
}

/** Interactive payment row showing category icon, note, relative timestamp, and amount. */
export function TransactionRow({
  transaction,
  currencySymbol,
  onSelect,
}: TransactionRowProps) {
  const categoryMeta = CATEGORY_MAP[transaction.category]
  const displayTitle = transaction.note || categoryMeta.label
  const timestampMeta = `${categoryMeta.shortLabel} · ${formatRelativeDayLabel(transaction.timestamp)} · ${formatPaymentTime(transaction.timestamp)}`

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-[18px] text-left hover:bg-spend-raised/70 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-2xl bg-spend-raised border border-spend-text/[0.08] flex items-center justify-center shrink-0">
          <CategoryIcon
            category={transaction.category}
            className={cn('h-4 w-4', categoryMeta.textClass)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-medium text-spend-text truncate">
              {displayTitle}
            </span>
            {transaction.isImpulse && (
              <span className="shrink-0 rounded-full bg-spend-exceeded/15 text-spend-exceeded px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                Impulse
              </span>
            )}
          </div>
          <p className="text-xs text-spend-muted num-tabular truncate mt-0.5">
            {timestampMeta}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[15px] font-semibold text-spend-text num-tabular">
          {formatCurrency(-transaction.amount, currencySymbol, {
            showSign: true,
          })}
        </span>
        <ChevronRight
          className="h-4 w-4 text-spend-muted/60"
          aria-hidden="true"
        />
      </div>
    </button>
  )
}
