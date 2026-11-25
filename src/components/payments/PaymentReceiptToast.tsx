import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CATEGORY_MAP } from '../../constants/categories'
import { cn } from '../../lib/cn'
import { formatPaymentDateTime } from '../../lib/date'
import { formatCurrency } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import type { Transaction } from '../../types/ledger'
import { CategoryIcon } from '../ui/CategoryIcon'

export interface PaymentReceiptToastProps {
  transaction: Transaction | null
  currencySymbol: string
  onDismiss: () => void
  durationMs?: number
}

/** Dynamic Island-inspired top receipt confirmation banner shown after saving a payment. */
export function PaymentReceiptToast({
  transaction,
  currencySymbol,
  onDismiss,
  durationMs = 4500,
}: PaymentReceiptToastProps) {
  const shouldReduceMotion = useReducedMotion()
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  const transactionId = transaction?.id

  useEffect(() => {
    if (!transactionId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current()
    }, durationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [transactionId, durationMs])

  const categoryMeta = transaction ? CATEGORY_MAP[transaction.category] : null
  const trimmedNote = transaction?.note.trim() ?? ''
  const showNoteSuffix =
    categoryMeta !== null &&
    trimmedNote.length > 0 &&
    trimmedNote !== categoryMeta.label

  return (
    <div className="fixed top-3 inset-x-0 z-50 px-4 pointer-events-none">
      <div className="max-w-[430px] mx-auto flex justify-center">
        <AnimatePresence mode="popLayout">
          {transaction && categoryMeta ? (
            <motion.div
              key={transaction.id}
              role="status"
              aria-live="polite"
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { y: -24, opacity: 0, scale: 0.96 }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { y: 0, opacity: 1, scale: 1 }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { y: -24, opacity: 0, scale: 0.96 }
              }
              transition={
                shouldReduceMotion ? { duration: 0 } : APPLE_SPRING
              }
              className="pointer-events-auto w-full rounded-[22px] bg-spend-surface/95 backdrop-blur-xl border border-spend-text/[0.12] px-4 py-3.5 shadow-2xl shadow-black/60 overflow-hidden relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-spend-raised border border-spend-text/[0.10] flex items-center justify-center shrink-0 relative">
                    <CategoryIcon
                      category={transaction.category}
                      className={cn('h-5 w-5', categoryMeta.textClass)}
                    />
                    <span
                      className={cn(
                        'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-spend-surface',
                        categoryMeta.bgClass,
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-spend-accent shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-spend-accent">
                        Payment Recorded
                      </span>
                      {transaction.isImpulse && (
                        <span className="rounded-full bg-spend-exceeded/15 text-spend-exceeded px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                          Impulse
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-spend-text truncate mt-0.5">
                      {categoryMeta.label}
                      {showNoteSuffix && (
                        <span className="text-spend-muted font-normal">
                          {' '}
                          · {trimmedNote}
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-spend-muted num-tabular mt-0.5 truncate">
                      {formatPaymentDateTime(transaction.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-base font-bold text-spend-text num-tabular">
                    {formatCurrency(-transaction.amount, currencySymbol, {
                      showSign: true,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss payment receipt"
                    className="p-1 -mr-1 rounded-full text-spend-muted hover:text-spend-text active:scale-[0.92] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {!shouldReduceMotion && (
                <div
                  className="absolute bottom-0 inset-x-0 h-[2px] bg-spend-text/[0.06]"
                  aria-hidden="true"
                >
                  <motion.div
                    key={transaction.id}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{
                      duration: durationMs / 1000,
                      ease: 'linear',
                    }}
                    className="h-full bg-spend-accent/80 origin-left"
                  />
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
