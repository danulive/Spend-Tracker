import { ReceiptText } from 'lucide-react'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { filterTransactions } from '../../lib/analytics'
import type { Transaction } from '../../types/ledger'
import { BentoCard } from '../ui/BentoCard'
import { TransactionRow } from './TransactionRow'

export interface RecentPaymentsSectionProps {
  transactions: Transaction[]
  searchQuery: string
  currencySymbol: string
  onSelectTransaction: (transaction: Transaction) => void
  onViewAll: () => void
}

/** Search-connected recent payments feed with empty states and History shortcut. */
export function RecentPaymentsSection({
  transactions,
  searchQuery,
  currencySymbol,
  onSelectTransaction,
  onViewAll,
}: RecentPaymentsSectionProps) {
  const isDesktop = useIsDesktop()
  const trimmedQuery = searchQuery.trim()
  const isSearching = trimmedQuery.length > 0
  const filtered = filterTransactions(transactions, searchQuery)
  const visibleLimit = isDesktop ? 15 : 10
  const visibleTransactions = isSearching
    ? filtered
    : filtered.slice(0, visibleLimit)

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2.5">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-spend-text num-tabular">
          {isSearching
            ? `Search Results (${filtered.length})`
            : 'Recent Payments'}
        </h2>
        {!isSearching && transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-spend-accent hover:opacity-80 active:scale-[0.96] transition-opacity rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
          >
            See all
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <BentoCard className="p-6 text-center space-y-2">
          <ReceiptText
            className="h-7 w-7 text-spend-muted mx-auto"
            aria-hidden="true"
          />
          <p className="text-[15px] font-semibold text-spend-text">
            No payments yet
          </p>
          <p className="text-xs text-spend-muted">
            Tap Add Payment above to log your first expense proof.
          </p>
        </BentoCard>
      ) : visibleTransactions.length === 0 ? (
        <BentoCard className="p-6 text-center space-y-1.5">
          <p className="text-[15px] font-semibold text-spend-text">
            No matching payments
          </p>
          <p className="text-xs text-spend-muted break-words">
            Nothing found for &ldquo;{trimmedQuery}&rdquo;.
          </p>
        </BentoCard>
      ) : (
        <BentoCard className="p-2 divide-y divide-spend-text/[0.06]">
          {visibleTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              currencySymbol={currencySymbol}
              onSelect={onSelectTransaction}
            />
          ))}
        </BentoCard>
      )}
    </div>
  )
}
