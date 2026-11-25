import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CATEGORIES, CATEGORY_MAP } from '../../constants/categories'
import { useLedger } from '../../context/LedgerContext'
import { cn } from '../../lib/cn'
import { formatCurrency, roundMoney } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import { getSmartFrequentPresets } from '../../lib/presets'
import type { CategoryId, FrequentPreset, Transaction } from '../../types/ledger'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'

export interface AddPaymentDrawerProps {
  isOpen: boolean
  onClose: () => void
  onPaymentSaved?: (transaction: Transaction) => void
}

function parseDecimalAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned || !/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? roundMoney(value) : null
}

function AddPaymentSheet({
  onClose,
  onPaymentSaved,
}: {
  onClose: () => void
  onPaymentSaved?: (transaction: Transaction) => void
}) {
  const { ledger, addTransaction } = useLedger()
  const shouldReduceMotion = useReducedMotion()
  const amountInputRef = useRef<HTMLInputElement>(null)

  const [amountInput, setAmountInput] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [isImpulse, setIsImpulse] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      amountInputRef.current?.focus({ preventScroll: true })
    }, 120)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const smartPresets = useMemo(
    () =>
      getSmartFrequentPresets(
        ledger.transactions,
        ledger.settings.customPresets ?? [],
        6,
      ),
    [ledger.transactions, ledger.settings.customPresets],
  )

  const { currencySymbol } = ledger.settings
  const parsedAmount = parseDecimalAmount(amountInput)
  const walletAfter = roundMoney(ledger.walletBalance - (parsedAmount ?? 0))

  const handleAmountChange = (raw: string) => {
    const normalized = raw.replace(/,/g, '')
    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmountInput(normalized)
      if (error) {
        setError(null)
      }
    }
  }

  const handleSelectPreset = (preset: FrequentPreset) => {
    setNote(preset.label)
    setCategory(preset.category)
    setIsImpulse(preset.isImpulse)
    if (preset.defaultAmount !== undefined) {
      setAmountInput(String(roundMoney(preset.defaultAmount)))
    }
    setError(null)
    amountInputRef.current?.focus()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (parsedAmount === null || parsedAmount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }

    const created = addTransaction({
      amount: parsedAmount,
      category,
      isImpulse,
      note: note.trim() || CATEGORY_MAP[category].label,
    })

    onPaymentSaved?.(created)
    setAmountInput('')
    setCategory('food')
    setIsImpulse(false)
    setNote('')
    setError(null)
    onClose()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-payment-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-spend-bg/75 backdrop-blur-sm"
      />

      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
        animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
        transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
        className="relative z-10 max-w-[430px] mx-auto w-full rounded-t-[28px] bg-spend-surface border-t border-x border-spend-text/[0.10] px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto"
      >
        <div
          className="w-10 h-1 rounded-full bg-spend-text/20 mx-auto mb-4"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between mb-4">
          <h2
            id="add-payment-title"
            className="text-[17px] font-semibold tracking-[-0.01em] text-spend-text"
          >
            Add Payment
          </h2>
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close payment drawer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted">
              Quick Fill
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {smartPresets.map((preset) => {
                const presetMeta = CATEGORY_MAP[preset.category]
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="rounded-full bg-spend-raised border border-spend-text/[0.10] px-3 py-1.5 text-xs font-medium text-spend-text flex items-center gap-1.5 shrink-0 active:scale-[0.96] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        presetMeta.bgClass,
                      )}
                      aria-hidden="true"
                    />
                    <span>{preset.label}</span>
                    {preset.defaultAmount !== undefined && (
                      <span className="text-spend-muted num-tabular">
                        {formatCurrency(preset.defaultAmount, currencySymbol)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="payment-amount-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Amount
            </label>
            <div className="flex items-baseline gap-2.5 rounded-2xl bg-spend-raised px-4 py-3.5 border border-spend-text/[0.10] focus-within:border-spend-accent/70 transition-colors">
              <span className="text-xl font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                ref={amountInputRef}
                id="payment-amount-input"
                type="text"
                inputMode="decimal"
                autoFocus
                value={amountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent text-3xl font-bold tracking-[-0.02em] text-spend-text placeholder:text-spend-muted/40 num-tabular focus:outline-none"
              />
            </div>

            <p
              className={cn(
                'text-xs num-tabular px-0.5',
                walletAfter < 0
                  ? 'text-spend-exceeded font-medium'
                  : 'text-spend-muted',
              )}
            >
              Wallet after: {formatCurrency(walletAfter, currencySymbol)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategory(cat.id)}
                    style={isSelected ? { borderColor: cat.hex } : undefined}
                    className={cn(
                      'h-9 rounded-full px-3 text-xs flex items-center gap-1.5 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                      isSelected
                        ? 'bg-spend-raised border-2 text-spend-text font-semibold'
                        : 'bg-spend-bg/60 border border-spend-text/[0.08] text-spend-muted hover:text-spend-text',
                    )}
                  >
                    {isSelected && (
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          cat.bgClass,
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <CategoryIcon
                      category={cat.id}
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        isSelected ? cat.textClass : 'text-current',
                      )}
                    />
                    <span>{cat.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted">
              Spend Type
            </p>
            <div
              role="group"
              aria-label="Essential or impulse spend"
              className="grid grid-cols-2 gap-1 rounded-full bg-spend-raised p-1 border border-spend-text/[0.10]"
            >
              <button
                type="button"
                aria-pressed={!isImpulse}
                onClick={() => setIsImpulse(false)}
                className={cn(
                  'rounded-full py-2 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                  !isImpulse
                    ? 'bg-spend-accent text-spend-bg font-semibold'
                    : 'text-spend-muted hover:text-spend-text',
                )}
              >
                Essential
              </button>
              <button
                type="button"
                aria-pressed={isImpulse}
                onClick={() => setIsImpulse(true)}
                className={cn(
                  'rounded-full py-2 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                  isImpulse
                    ? 'bg-spend-exceeded text-spend-text font-semibold'
                    : 'text-spend-muted hover:text-spend-text',
                )}
              >
                Impulse / Wasted
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="payment-note-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Note
            </label>
            <input
              id="payment-note-input"
              type="text"
              maxLength={80}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was this for? (optional)"
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

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3.5 rounded-full font-semibold"
          >
            Add Payment
          </Button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/** Bottom sheet drawer for fast 1-tap preset and custom expense entry. */
export function AddPaymentDrawer({
  isOpen,
  onClose,
  onPaymentSaved,
}: AddPaymentDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <AddPaymentSheet
          key="add-payment-sheet"
          onClose={onClose}
          onPaymentSaved={onPaymentSaved}
        />
      ) : null}
    </AnimatePresence>
  )
}
