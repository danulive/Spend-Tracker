import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLedger } from '../../context/LedgerContext'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { cn } from '../../lib/cn'
import { formatCurrency, roundMoney } from '../../lib/format'
import { getSheetMotionProps } from '../../lib/motion'
import { Button } from '../ui/Button'

export interface WalletAdjustDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type AdjustMode = 'add' | 'set'

function parseDecimalAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned || !/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? roundMoney(value) : null
}

function WalletAdjustSheet({ onClose }: { onClose: () => void }) {
  const { ledger, addWalletFunds, setWalletBalance } = useLedger()
  const shouldReduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const sheetMotion = getSheetMotionProps(Boolean(shouldReduceMotion), isDesktop)

  const [mode, setMode] = useState<AdjustMode>('add')
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const { currencyCode, currencySymbol } = ledger.settings
  const isLargeUnit = currencyCode === 'LKR' || currencyCode === 'INR'
  const quickAmounts = isLargeUnit ? [500, 1000, 5000] : [10, 50, 100]

  const parsedAmount = parseDecimalAmount(amountInput)
  const previewBalance =
    mode === 'add'
      ? roundMoney(ledger.walletBalance + (parsedAmount ?? 0))
      : parsedAmount !== null
        ? parsedAmount
        : ledger.walletBalance

  const handleModeSwitch = (nextMode: AdjustMode) => {
    setMode(nextMode)
    setError(null)

    if (nextMode === 'set') {
      setAmountInput(
        ledger.walletBalance > 0 ? String(ledger.walletBalance) : '',
      )
    } else {
      setAmountInput('')
    }
  }

  const handleAmountChange = (raw: string) => {
    const normalized = raw.replace(/,/g, '')
    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmountInput(normalized)
      if (error) {
        setError(null)
      }
    }
  }

  const handleQuickFill = (chipAmount: number) => {
    const current = parseDecimalAmount(amountInput) ?? 0
    setAmountInput(String(roundMoney(current + chipAmount)))
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (mode === 'add') {
      if (parsedAmount === null || parsedAmount <= 0) {
        setError('Enter a valid amount greater than 0.')
        return
      }
      addWalletFunds(parsedAmount, note.trim())
    } else {
      if (parsedAmount === null || parsedAmount < 0) {
        setError('Enter a valid balance of 0 or more.')
        return
      }
      setWalletBalance(parsedAmount, note.trim())
    }

    setAmountInput('')
    setNote('')
    setError(null)
    onClose()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-adjust-title"
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

        <div className="flex items-center justify-between mb-4">
          <h2
            id="wallet-adjust-title"
            className="text-[17px] font-semibold tracking-[-0.01em] text-spend-text"
          >
            Update Wallet
          </h2>
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close wallet drawer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            role="tablist"
            aria-label="Wallet update mode"
            className="grid grid-cols-2 gap-1 rounded-full bg-spend-raised p-1 border border-spend-text/[0.10]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'add'}
              onClick={() => handleModeSwitch('add')}
              className={cn(
                'rounded-full py-2 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                mode === 'add'
                  ? 'bg-spend-accent text-spend-bg font-semibold'
                  : 'text-spend-muted hover:text-spend-text',
              )}
            >
              Add Funds
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'set'}
              onClick={() => handleModeSwitch('set')}
              className={cn(
                'rounded-full py-2 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                mode === 'set'
                  ? 'bg-spend-accent text-spend-bg font-semibold'
                  : 'text-spend-muted hover:text-spend-text',
              )}
            >
              Set Balance
            </button>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="wallet-amount-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              {mode === 'add' ? 'Amount to Add' : 'New Wallet Balance'}
            </label>

            <div className="flex items-baseline gap-2.5 rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-4 py-3 focus-within:border-spend-accent/60 transition-colors">
              <span className="text-xl font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                id="wallet-amount-input"
                type="text"
                inputMode="decimal"
                autoFocus
                value={amountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent text-3xl font-bold tracking-[-0.02em] text-spend-text placeholder:text-spend-muted/40 num-tabular focus:outline-none"
              />
            </div>

            {mode === 'add' && (
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((chipAmount) => (
                  <button
                    key={chipAmount}
                    type="button"
                    onClick={() => handleQuickFill(chipAmount)}
                    className="rounded-full bg-spend-raised hover:border-spend-text/[0.20] border border-spend-text/[0.10] px-3.5 py-1.5 text-xs font-medium text-spend-text num-tabular active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
                  >
                    +{chipAmount.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="wallet-note-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Note (Optional)
            </label>
            <input
              id="wallet-note-input"
              type="text"
              maxLength={60}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note (e.g. Monthly allowance, ATM cash)"
              className="w-full h-11 rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-4 text-sm text-spend-text placeholder:text-spend-muted focus:outline-none focus:border-spend-accent/60 transition-colors"
            />
          </div>

          <div className="bg-spend-raised rounded-2xl px-4 py-3 border border-spend-text/[0.08] space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs num-tabular">
              <span className="text-spend-muted">
                Current: {formatCurrency(ledger.walletBalance, currencySymbol)}
              </span>
              <span className="text-spend-accent font-semibold">
                New: {formatCurrency(previewBalance, currencySymbol)}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-spend-muted">
              Manual wallet updates are logged in your audit trail and never
              count as spending.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-spend-exceeded px-1"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3.5 rounded-full"
          >
            {mode === 'add' ? 'Add to Wallet' : 'Save New Balance'}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/** Bottom sheet drawer for manual wallet top-ups and exact balance overrides. */
export function WalletAdjustDrawer({
  isOpen,
  onClose,
}: WalletAdjustDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen ? <WalletAdjustSheet key="wallet-adjust-sheet" onClose={onClose} /> : null}
    </AnimatePresence>
  )
}
