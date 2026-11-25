import { Check, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES } from '../../constants/categories'
import { useLedger } from '../../context/LedgerContext'
import { filterTransactions } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import {
  buildMonthlyProofCsv,
  downloadCsvFile,
  formatMonthKeyLabel,
  getAvailableMonthKeys,
  getLocalMonthKey,
  groupTransactionsByLocalDay,
} from '../../lib/exportCsv'
import { formatCurrency, roundMoney } from '../../lib/format'
import type { CategoryId, Transaction, WalletAdjustment } from '../../types/ledger'
import { EditWalletAdjustmentDrawer } from '../history/EditWalletAdjustmentDrawer'
import { WalletAdjustmentRow } from '../history/WalletAdjustmentRow'
import { EditPaymentDrawer } from '../payments/EditPaymentDrawer'
import { TransactionRow } from '../payments/TransactionRow'
import { BentoCard } from '../ui/BentoCard'

export interface HistoryScreenProps {
  searchQuery: string
}

type HistorySubTab = 'payments' | 'audit'
type CategoryFilter = CategoryId | 'all' | 'impulse'

/** History tab with date-grouped Payments archive, Wallet Audit Log, and CSV proof export. */
export function HistoryScreen({ searchQuery }: HistoryScreenProps) {
  const { ledger } = useLedger()
  const [subTab, setSubTab] = useState<HistorySubTab>('payments')
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getLocalMonthKey(new Date()),
  )
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingAdjustment, setEditingAdjustment] =
    useState<WalletAdjustment | null>(null)
  const [justExported, setJustExported] = useState(false)
  const exportTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (exportTimerRef.current !== null) {
        window.clearTimeout(exportTimerRef.current)
      }
    }
  }, [])

  const { currencyCode, currencySymbol } = ledger.settings
  const trimmedSearch = searchQuery.trim()
  const periodLabel = formatMonthKeyLabel(selectedMonth)

  const availableMonths = useMemo(
    () =>
      getAvailableMonthKeys(ledger.transactions, ledger.walletAdjustments),
    [ledger.transactions, ledger.walletAdjustments],
  )

  const monthTransactions = useMemo(() => {
    const scoped =
      selectedMonth === 'all'
        ? ledger.transactions
        : ledger.transactions.filter(
            (tx) => getLocalMonthKey(tx.timestamp) === selectedMonth,
          )
    return filterTransactions(scoped, '', 'all')
  }, [ledger.transactions, selectedMonth])

  const filteredPayments = useMemo(() => {
    if (categoryFilter === 'impulse') {
      return filterTransactions(monthTransactions, searchQuery, 'all').filter(
        (tx) => tx.isImpulse,
      )
    }
    return filterTransactions(monthTransactions, searchQuery, categoryFilter)
  }, [monthTransactions, searchQuery, categoryFilter])

  const { filteredTotal, filteredImpulseTotal } = useMemo(() => {
    let total = 0
    let impulse = 0
    for (const tx of filteredPayments) {
      const amount = roundMoney(tx.amount)
      total = roundMoney(total + amount)
      if (tx.isImpulse) {
        impulse = roundMoney(impulse + amount)
      }
    }
    return { filteredTotal: total, filteredImpulseTotal: impulse }
  }, [filteredPayments])

  const dayGroups = useMemo(
    () => groupTransactionsByLocalDay(filteredPayments),
    [filteredPayments],
  )

  const filteredAdjustments = useMemo(() => {
    const normalizedQuery = trimmedSearch.toLowerCase()
    const scoped =
      selectedMonth === 'all'
        ? ledger.walletAdjustments
        : ledger.walletAdjustments.filter(
            (adj) => getLocalMonthKey(adj.timestamp) === selectedMonth,
          )

    return scoped
      .filter((adj) => {
        if (!normalizedQuery) {
          return true
        }
        const typeLabel =
          adj.type === 'add' ? 'manual top-up' : 'balance override'
        return (
          adj.note.toLowerCase().includes(normalizedQuery) ||
          adj.type.toLowerCase().includes(normalizedQuery) ||
          typeLabel.includes(normalizedQuery)
        )
      })
      .sort((a, b) => {
        const diff = Date.parse(b.timestamp) - Date.parse(a.timestamp)
        return Number.isNaN(diff) ? 0 : diff
      })
  }, [ledger.walletAdjustments, selectedMonth, trimmedSearch])

  const handleExportCsv = () => {
    if (monthTransactions.length === 0) {
      return
    }

    const csv = buildMonthlyProofCsv(
      monthTransactions,
      periodLabel,
      currencyCode,
    )
    downloadCsvFile(`spendtracker-proof-${selectedMonth}.csv`, csv)

    if (exportTimerRef.current !== null) {
      window.clearTimeout(exportTimerRef.current)
    }
    setJustExported(true)
    exportTimerRef.current = window.setTimeout(() => {
      setJustExported(false)
      exportTimerRef.current = null
    }, 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-spend-text">
            History
          </h1>
          <p className="text-xs text-spend-muted truncate">{periodLabel}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={monthTransactions.length === 0}
          className="rounded-full bg-spend-raised border border-spend-text/[0.10] px-3.5 py-2 text-xs font-medium text-spend-text flex items-center gap-1.5 shrink-0 active:scale-[0.96] transition-transform disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
        >
          {justExported ? (
            <>
              <Check
                className="h-3.5 w-3.5 text-spend-accent"
                aria-hidden="true"
              />
              <span>Exported</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="History sections"
        className="grid grid-cols-2 rounded-full bg-spend-raised p-1 border border-spend-text/[0.10] mb-3.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'payments'}
          onClick={() => setSubTab('payments')}
          className={cn(
            'rounded-full py-2 text-xs transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
            subTab === 'payments'
              ? 'bg-spend-accent text-spend-bg font-semibold'
              : 'text-spend-muted hover:text-spend-text',
          )}
        >
          Payments
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'audit'}
          onClick={() => setSubTab('audit')}
          className={cn(
            'rounded-full py-2 text-xs transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
            subTab === 'audit'
              ? 'bg-spend-accent text-spend-bg font-semibold'
              : 'text-spend-muted hover:text-spend-text',
          )}
        >
          Wallet Audit
        </button>
      </div>

      <div
        role="group"
        aria-label="Filter by month"
        className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar"
      >
        {[...availableMonths, 'all'].map((monthKey) => {
          const isSelected = selectedMonth === monthKey
          return (
            <button
              key={monthKey}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedMonth(monthKey)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs shrink-0 active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                isSelected
                  ? 'bg-spend-text text-spend-bg font-semibold'
                  : 'bg-spend-raised text-spend-muted border border-spend-text/[0.08] hover:text-spend-text',
              )}
            >
              {formatMonthKeyLabel(monthKey)}
            </button>
          )
        })}
      </div>

      {subTab === 'payments' ? (
        <div>
          <div
            role="group"
            aria-label="Filter by category"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3.5 no-scrollbar"
          >
            <button
              type="button"
              aria-pressed={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs shrink-0 active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                categoryFilter === 'all'
                  ? 'bg-spend-accent/15 text-spend-accent border border-spend-accent/40 font-semibold'
                  : 'bg-spend-raised text-spend-muted border border-spend-text/[0.08] hover:text-spend-text',
              )}
            >
              All
            </button>

            <button
              type="button"
              aria-pressed={categoryFilter === 'impulse'}
              onClick={() => setCategoryFilter('impulse')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs shrink-0 active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                categoryFilter === 'impulse'
                  ? 'bg-spend-exceeded/20 text-spend-exceeded border border-spend-exceeded/40 font-semibold'
                  : 'bg-spend-raised text-spend-muted border border-spend-text/[0.08] hover:text-spend-text',
              )}
            >
              Impulse
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = categoryFilter === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0 active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                    isSelected
                      ? 'bg-spend-accent/15 text-spend-accent border border-spend-accent/40 font-semibold'
                      : 'bg-spend-raised text-spend-muted border border-spend-text/[0.08] hover:text-spend-text',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      cat.bgClass,
                    )}
                    aria-hidden="true"
                  />
                  <span>{cat.shortLabel}</span>
                </button>
              )
            })}
          </div>

          <BentoCard className="p-3.5 mb-3.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-spend-muted num-tabular">
                {filteredPayments.length}{' '}
                {filteredPayments.length === 1 ? 'payment' : 'payments'}
              </p>
              <p className="text-base font-bold text-spend-text num-tabular truncate mt-0.5">
                {formatCurrency(filteredTotal, currencySymbol)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] text-spend-muted">Wasted</p>
              <p
                className={cn(
                  'text-sm font-semibold num-tabular mt-0.5',
                  filteredImpulseTotal > 0
                    ? 'text-spend-exceeded'
                    : 'text-spend-muted',
                )}
              >
                {formatCurrency(filteredImpulseTotal, currencySymbol)}
              </p>
            </div>
          </BentoCard>

          {dayGroups.length === 0 ? (
            <BentoCard className="p-6 text-center space-y-1.5">
              <p className="text-[15px] font-semibold text-spend-text">
                No payments found
              </p>
              <p className="text-xs text-spend-muted break-words">
                {trimmedSearch
                  ? `Nothing matching "${trimmedSearch}" in ${periodLabel}.`
                  : categoryFilter !== 'all'
                    ? `No matching category payments recorded for ${periodLabel}.`
                    : `No payments recorded for ${periodLabel}.`}
              </p>
            </BentoCard>
          ) : (
            <div className="space-y-4">
              {dayGroups.map((group) => (
                <section key={group.dateKey} aria-label={group.label}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-spend-muted">
                      {group.label}
                    </h2>
                    <span className="text-xs font-medium text-spend-muted num-tabular">
                      {formatCurrency(group.dayTotal, currencySymbol)}
                    </span>
                  </div>

                  <BentoCard className="p-2 divide-y divide-spend-text/[0.06]">
                    {group.items.map((tx) => (
                      <TransactionRow
                        key={tx.id}
                        transaction={tx}
                        currencySymbol={currencySymbol}
                        onSelect={setEditingTx}
                      />
                    ))}
                  </BentoCard>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-xs text-spend-muted px-1 mb-3">
            Manual wallet top-ups and balance overrides are recorded separately
            from spending.
          </p>

          {filteredAdjustments.length === 0 ? (
            <BentoCard className="p-6 text-center">
              <p className="text-xs text-spend-muted">
                No wallet adjustments in this period.
              </p>
            </BentoCard>
          ) : (
            <BentoCard className="p-1.5 divide-y divide-spend-text/[0.06]">
              {filteredAdjustments.map((adjustment) => (
                <WalletAdjustmentRow
                  key={adjustment.id}
                  adjustment={adjustment}
                  currencySymbol={currencySymbol}
                  onSelect={setEditingAdjustment}
                />
              ))}
            </BentoCard>
          )}
        </div>
      )}

      <EditPaymentDrawer
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
      />

      <EditWalletAdjustmentDrawer
        adjustment={editingAdjustment}
        onClose={() => setEditingAdjustment(null)}
      />
    </div>
  )
}
