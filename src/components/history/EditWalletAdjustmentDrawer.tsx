import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Clock, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLedger } from '../../context/LedgerContext'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { cn } from '../../lib/cn'
import { formatPaymentDateTime } from '../../lib/date'
import { formatCurrency, roundMoney } from '../../lib/format'
import { getSheetMotionProps } from '../../lib/motion'
import type { WalletAdjustment } from '../../types/ledger'
import { Button } from '../ui/Button'

export interface EditWalletAdjustmentDrawerProps {
  adjustment: WalletAdjustment | null
  onClose: () => void
}

function parseDecimalAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned || !/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? roundMoney(value) : null
}

function EditWalletAdjustmentSheet({
  adjustment,
  onClose,
}: {
  adjustment: WalletAdjustment
  onClose: () => void
}) {
  const { ledger, updateWalletAdjustment, deleteWalletAdjustment } = useLedger()
  const shouldReduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const sheetMotion = getSheetMotionProps(Boolean(shouldReduceMotion), isDesktop)

  const initialAmount =
    adjustment.type === 'add' ? adjustment.delta : adjustment.newBalance

  const [amountInput, setAmountInput] = useState(() =>
    String(roundMoney(initialAmount)),
  )
  const [note, setNote] = useState(adjustment.note)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const { currencySymbol } = ledger.settings
  const parsedAmount = parseDecimalAmount(amountInput)
  const isAdd = adjustment.type === 'add'

  const isAmountValid =
    parsedAmount !== null && (isAdd ? parsedAmount > 0 : parsedAmount >= 0)

  const projectedDelta =
    parsedAmount === null
      ? adjustment.delta
      : isAdd
        ? parsedAmount
        : roundMoney(parsedAmount - adjustment.previousBalance)

  const projectedWallet = roundMoney(
    ledger.walletBalance + (projectedDelta - adjustment.delta),
  )

  const handleAmountChange = (raw: string) => {
    const normalized = raw.replace(/,/g, '')
    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmountInput(normalized)
      if (error) {
        setError('')
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isAmountValid || parsedAmount === null) {
      setError(
        isAdd
          ? 'Enter a valid top-up amount greater than 0.'
          : 'Enter a valid target balance of 0 or more.',
      )
      return
    }

    updateWalletAdjustment({
      id: adjustment.id,
      amount: parsedAmount,
      note: note.trim(),
    })
    onClose()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-wallet-entry-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-spend-bg/75 backdrop-blur-sm"
      />

      <motion.div
        {...sheetMotion}
        className="relative z-10 max-w-[430px] lg:max-w-[460px] mx-auto w-full rounded-t-[28px] lg:rounded-[28px] bg-spend-surface border-t border-x lg:border border-spend-text/[0.10] px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:p-6 max-h-[90dvh] overflow-y-auto"
      >
        <div
          className="w-10 h-1 rounded-full bg-spend-text/20 mx-auto mb-4 lg:hidden"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between mb-2">
          <h2
            id="edit-wallet-entry-title"
            className="text-[17px] font-semibold tracking-[-0.01em] text-spend-text"
          >
            Edit Wallet Entry
          </h2>
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close edit wallet entry drawer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-1.5 text-xs text-spend-muted num-tabular">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Recorded {formatPaymentDateTime(adjustment.timestamp)}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="edit-wallet-amount-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              {isAdd ? 'Top-Up Amount' : 'Target Balance'}
            </label>

            <div className="flex items-baseline gap-2.5 rounded-2xl bg-spend-raised px-4 py-3.5 border border-spend-text/[0.10] focus-within:border-spend-accent/70 transition-colors">
              <span className="text-xl font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                id="edit-wallet-amount-input"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent text-3xl font-bold tracking-[-0.02em] text-spend-text placeholder:text-spend-muted/40 num-tabular focus:outline-none"
              />
            </div>

            <div className="bg-spend-raised rounded-2xl px-3.5 py-2.5 border border-spend-text/[0.08] flex items-center justify-between gap-2 text-xs num-tabular">
              <span className="text-spend-muted">
                Current: {formatCurrency(ledger.walletBalance, currencySymbol)}
              </span>
              <span
                className={cn(
                  'font-semibold',
                  projectedWallet < 0
                    ? 'text-spend-exceeded'
                    : 'text-spend-accent',
                )}
              >
                Wallet after: {formatCurrency(projectedWallet, currencySymbol)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-wallet-note-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Note
            </label>
            <input
              id="edit-wallet-note-input"
              type="text"
              maxLength={60}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isAdd ? 'Note (e.g. Monthly allowance)' : 'Note (e.g. Reconcile)'
              }
              className="w-full rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-4 py-3 text-sm text-spend-text placeholder:text-spend-muted focus:outline-none focus:border-spend-accent/70 transition-colors"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-spend-exceeded px-1"
            >
              {error}
            </p>
          )}

          <div className="space-y-2.5 pt-1">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3.5 rounded-full font-semibold"
            >
              Save Changes
            </Button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-full py-3 text-sm font-medium text-spend-exceeded bg-spend-exceeded/10 border border-spend-exceeded/20 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-exceeded"
              >
                Delete Entry &amp; Reverse Balance
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(false)}
                  className="w-full py-3 rounded-full"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    deleteWalletAdjustment(adjustment.id)
                    onClose()
                  }}
                  className="w-full rounded-full py-3 text-sm font-semibold bg-spend-exceeded text-spend-text active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-exceeded"
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/** Bottom sheet drawer for editing or deleting a Wallet Audit entry with balance reversal. */
export function EditWalletAdjustmentDrawer({
  adjustment,
  onClose,
}: EditWalletAdjustmentDrawerProps) {
  return (
    <AnimatePresence>
      {adjustment ? (
        <EditWalletAdjustmentSheet
          key={adjustment.id}
          adjustment={adjustment}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>
  )
}
