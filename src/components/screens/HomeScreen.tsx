import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLedger } from '../../context/LedgerContext'
import type { Transaction } from '../../types/ledger'
import type { UserProfileSummary } from '../../types/navigation'
import { DailyProofBentoCard } from '../bento/DailyProofBentoCard'
import { SpendingBentoCard } from '../bento/SpendingBentoCard'
import { AddPaymentDrawer } from '../payments/AddPaymentDrawer'
import { EditPaymentDrawer } from '../payments/EditPaymentDrawer'
import { PaymentReceiptToast } from '../payments/PaymentReceiptToast'
import { RecentPaymentsSection } from '../payments/RecentPaymentsSection'
import { WalletAdjustDrawer } from '../wallet/WalletAdjustDrawer'
import { WalletCard } from '../wallet/WalletCard'

export interface HomeScreenProps {
  searchQuery: string
  onViewAllHistory: () => void
  onOpenAnalytics?: () => void
  user?: UserProfileSummary
}

/** Primary Home tab featuring Wallet Card, Middle Bento Row, Quick-Add CTA, Recent Payments, and drawers. */
export function HomeScreen({
  searchQuery,
  onViewAllHistory,
  onOpenAnalytics,
  user,
}: HomeScreenProps) {
  const { ledger, metrics } = useLedger()
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [lastSavedTx, setLastSavedTx] = useState<Transaction | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const handleDismissToast = useCallback(() => {
    setLastSavedTx(null)
  }, [])

  return (
    <div>
      <PaymentReceiptToast
        transaction={lastSavedTx}
        currencySymbol={ledger.settings.currencySymbol}
        onDismiss={handleDismissToast}
      />

      <WalletCard
        balance={ledger.walletBalance}
        currencySymbol={ledger.settings.currencySymbol}
        currencyCode={ledger.settings.currencyCode}
        accountName={user?.name}
        lastAdjustmentTimestamp={ledger.walletAdjustments[0]?.timestamp}
        onOpenAdjust={() => setIsWalletDrawerOpen(true)}
      />

      <section
        aria-label="Spending summary"
        className="mt-3.5 grid grid-cols-2 gap-3"
      >
        <SpendingBentoCard
          metrics={metrics}
          currencySymbol={ledger.settings.currencySymbol}
          onNavigateAnalytics={onOpenAnalytics}
        />
        <DailyProofBentoCard
          metrics={metrics}
          currencySymbol={ledger.settings.currencySymbol}
          onNavigateAnalytics={onOpenAnalytics}
        />
      </section>

      <button
        type="button"
        onClick={() => setIsAddPaymentOpen(true)}
        className="mt-3.5 w-full rounded-[20px] bg-spend-accent text-spend-bg px-5 py-3.5 font-semibold text-[15px] flex items-center justify-between active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-bg"
      >
        <span className="flex items-center gap-2.5">
          <span className="bg-spend-bg/15 rounded-full p-1 inline-flex items-center justify-center">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Add Payment</span>
        </span>
        <span className="text-xs font-medium text-spend-bg/70">Log expense</span>
      </button>

      <section aria-label="Recent payments" className="mt-5">
        <RecentPaymentsSection
          transactions={ledger.transactions}
          searchQuery={searchQuery}
          currencySymbol={ledger.settings.currencySymbol}
          onSelectTransaction={setEditingTx}
          onViewAll={onViewAllHistory}
        />
      </section>

      <WalletAdjustDrawer
        isOpen={isWalletDrawerOpen}
        onClose={() => setIsWalletDrawerOpen(false)}
      />

      <AddPaymentDrawer
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        onPaymentSaved={(tx) => setLastSavedTx(tx)}
      />

      <EditPaymentDrawer
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
      />
    </div>
  )
}
