import { Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatPaymentDateTime } from '../../lib/date'
import { formatCurrency } from '../../lib/format'
import { BentoCard } from '../ui/BentoCard'

export interface WalletCardProps {
  balance: number
  currencySymbol: string
  currencyCode: string
  accountName?: string
  lastAdjustmentTimestamp?: string
  onOpenAdjust: () => void
}

/** Apple Wallet-inspired dark brushed-metal hero card displaying live wallet balance. */
export function WalletCard({
  balance,
  currencySymbol,
  currencyCode,
  accountName = 'Personal Wallet',
  lastAdjustmentTimestamp,
  onOpenAdjust,
}: WalletCardProps) {
  const displayName = accountName.trim() || 'Personal Wallet'
  const formattedTimestamp = lastAdjustmentTimestamp
    ? formatPaymentDateTime(lastAdjustmentTimestamp)
    : ''

  return (
    <BentoCard
      variant="wallet"
      className="relative overflow-hidden min-h-[196px] flex flex-col justify-between"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-spend-text/[0.04] blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-spend-text">Wallet</p>
          <p className="text-base font-normal text-spend-muted mt-0.5 truncate max-w-[220px]">
            {displayName}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAdjust}
          aria-label="Update wallet balance"
          className="h-9 w-9 shrink-0 rounded-full bg-spend-text/[0.07] hover:bg-spend-text/[0.12] border border-spend-text/[0.10] text-spend-text flex items-center justify-center active:scale-[0.95] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p
        className={cn(
          'relative text-[2.125rem] font-bold leading-[1.1] tracking-[-0.03em] num-tabular mt-6 break-words',
          balance < 0 ? 'text-spend-exceeded' : 'text-spend-text',
        )}
      >
        {formatCurrency(balance, currencySymbol)}
      </p>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-spend-muted num-tabular truncate">
          {formattedTimestamp
            ? `Updated · ${formattedTimestamp}`
            : 'Tap + to set starting balance'}
        </p>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-medium tracking-wider text-spend-muted uppercase">
            {currencyCode}
          </span>
          <span className="relative flex items-center" aria-hidden="true">
            <span className="h-[18px] w-[18px] rounded-full bg-spend-accent/90" />
            <span className="-ml-2 h-[18px] w-[18px] rounded-full bg-spend-text/30" />
          </span>
        </div>
      </div>
    </BentoCard>
  )
}
