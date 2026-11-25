import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, type FormEvent } from 'react'
import { CURRENCIES } from '../../constants/categories'
import { useLedger } from '../../context/LedgerContext'
import { cn } from '../../lib/cn'
import { roundMoney } from '../../lib/format'
import { APPLE_SPRING } from '../../lib/motion'
import type { CurrencyCode } from '../../types/ledger'
import { Button } from '../ui/Button'

export interface OnboardingModalProps {
  isOpen: boolean
  userName?: string
}

function parseOptionalNonNegativeAmount(raw: string): number | 'invalid' {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) {
    return 0
  }
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return 'invalid'
  }
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) {
    return 'invalid'
  }
  return roundMoney(value)
}

function OnboardingSheet({ userName }: { userName?: string }) {
  const { ledger, updateSettings, setWalletBalance } = useLedger()
  const shouldReduceMotion = useReducedMotion()

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(
    ledger.settings.currencyCode,
  )
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    ledger.settings.currencySymbol,
  )
  const [balanceInput, setBalanceInput] = useState('')
  const [capInput, setCapInput] = useState(() =>
    ledger.settings.dailyLimit > 0 ? String(ledger.settings.dailyLimit) : '',
  )
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const firstName = userName?.trim().split(/\s+/)[0] ?? ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedBalance = parseOptionalNonNegativeAmount(balanceInput)
    if (parsedBalance === 'invalid') {
      setError('Enter a valid starting balance of 0 or more.')
      return
    }

    const parsedCap = parseOptionalNonNegativeAmount(capInput)
    if (parsedCap === 'invalid') {
      setError('Enter a valid daily spending cap of 0 or more.')
      return
    }

    updateSettings({
      currencyCode,
      currencySymbol,
      dailyLimit: parsedCap,
      onboardingCompleted: true,
    })

    if (
      parsedBalance > 0 &&
      ledger.walletBalance === 0 &&
      ledger.walletAdjustments.length === 0
    ) {
      setWalletBalance(parsedBalance, 'Starting balance')
    }
  }

  const handleSkip = () => {
    updateSettings({ onboardingCompleted: true })
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-spend-bg/85 backdrop-blur-md"
    >
      <motion.div
        initial={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }
        }
        animate={
          shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        exit={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }
        }
        transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
        className="max-w-[400px] w-full rounded-[28px] bg-spend-surface border border-spend-text/[0.12] p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spend-accent">
            WELCOME TO SPENDTRACKER
          </p>
          <h2
            id="onboarding-title"
            className="text-2xl font-bold tracking-[-0.02em] text-spend-text mt-1"
          >
            {firstName ? `Hi, ${firstName}` : 'Set up your wallet'}
          </h2>
          <p className="text-xs text-spend-muted mt-1 leading-relaxed">
            Pick your currency, starting cash on hand, and daily spending cap.
            You can change these anytime in Account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted">
              Currency
            </p>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((currency) => {
                const isSelected = currency.code === currencyCode
                return (
                  <button
                    key={currency.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setCurrencyCode(currency.code)
                      setCurrencySymbol(currency.symbol)
                    }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs num-tabular transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                      isSelected
                        ? 'bg-spend-accent text-spend-bg font-semibold'
                        : 'bg-spend-raised text-spend-muted border border-spend-text/[0.08] hover:text-spend-text',
                    )}
                  >
                    {currency.symbol} {currency.code}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-balance-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Starting Wallet Balance (Optional)
            </label>
            <div className="flex items-baseline gap-2 rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-4 py-3 focus-within:border-spend-accent/70 transition-colors">
              <span className="text-lg font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                id="onboarding-balance-input"
                type="text"
                inputMode="decimal"
                value={balanceInput}
                onChange={(event) => {
                  setBalanceInput(event.target.value)
                  if (error) setError('')
                }}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent text-2xl font-bold tracking-[-0.02em] text-spend-text placeholder:text-spend-muted/40 num-tabular focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-cap-input"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-spend-muted"
            >
              Daily Spending Cap (Optional)
            </label>
            <div className="flex items-baseline gap-2 rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-4 py-2.5 focus-within:border-spend-accent/70 transition-colors">
              <span className="text-base font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                id="onboarding-cap-input"
                type="text"
                inputMode="decimal"
                value={capInput}
                onChange={(event) => {
                  setCapInput(event.target.value)
                  if (error) setError('')
                }}
                placeholder="e.g. 1500 (0 = off)"
                className="w-full min-w-0 bg-transparent text-xl font-bold tracking-[-0.02em] text-spend-text placeholder:text-spend-muted/40 num-tabular focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-spend-exceeded px-1"
            >
              {error}
            </p>
          )}

          <div className="pt-1 space-y-1.5">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3.5 rounded-full font-semibold"
            >
              Start Tracking
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2.5 text-xs text-spend-muted hover:text-spend-text rounded-full active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
            >
              Skip for now
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/** First-login setup modal configuring currency, initial wallet cash, and daily cap. */
export function OnboardingModal({ isOpen, userName }: OnboardingModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <OnboardingSheet key="onboarding-sheet" userName={userName} />
      ) : null}
    </AnimatePresence>
  )
}
