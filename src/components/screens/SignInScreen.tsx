import { motion, useReducedMotion } from 'framer-motion'
import { ExternalLink, Loader2, ShieldCheck, TrendingDown, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { APPLE_SPRING } from '../../lib/motion'
import { BentoCard } from '../ui/BentoCard'
import { MobileFrame } from '../ui/MobileFrame'

/** Apple-inspired Sign-In gate requiring Google authentication before accessing user ledgers. */
export function SignInScreen() {
  const { status, error, isConfigured, signIn } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const isSigningIn = status === 'signing_in'

  return (
    <MobileFrame className="lg:max-w-[440px] lg:mx-auto min-h-dvh flex flex-col justify-between py-10 lg:py-10">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
      >
        <div className="flex items-center" aria-hidden="true">
          <span className="h-11 w-11 bg-spend-accent rounded-full" />
          <span className="-ml-4 h-11 w-11 bg-spend-text/25 rounded-full backdrop-blur-sm border border-spend-text/[0.12]" />
        </div>

        <h1 className="text-3xl font-bold tracking-[-0.03em] text-spend-text mt-5">
          SpendTracker
        </h1>
        <p className="text-sm text-spend-muted mt-2 leading-relaxed max-w-[300px]">
          Stop wasting money with timestamped daily proof. Private to your
          Google Drive.
        </p>

        <BentoCard className="p-4 space-y-3.5 mt-8">
          <div className="flex items-start gap-3">
            <Wallet
              className="h-5 w-5 text-spend-accent shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-spend-text">
                Manual Wallet &amp; Audit Trail
              </p>
              <p className="text-xs text-spend-muted mt-0.5">
                Track real cash on hand without skewing spending.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t border-spend-text/[0.06]">
            <TrendingDown
              className="h-5 w-5 text-spend-accent shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-spend-text">
                Today vs. Yesterday Proof
              </p>
              <p className="text-xs text-spend-muted mt-0.5">
                See instantly what you saved or exceeded each day.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t border-spend-text/[0.06]">
            <ShieldCheck
              className="h-5 w-5 text-spend-accent shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-spend-text">
                Private Google Drive Sync
              </p>
              <p className="text-xs text-spend-muted mt-0.5">
                Your ledger stays in your own Google account—never wiped on
                logout.
              </p>
            </div>
          </div>
        </BentoCard>
      </motion.div>

      <div className="mt-8 space-y-3">
        {!isConfigured && (
          <BentoCard className="p-4 border-spend-accent/30 space-y-1.5">
            <p className="text-xs font-semibold text-spend-accent">
              Missing VITE_GOOGLE_CLIENT_ID
            </p>
            <p className="text-xs text-spend-muted leading-relaxed">
              Create <code className="text-spend-text">.env.local</code> in the
              project root, add{' '}
              <code className="text-spend-text">VITE_GOOGLE_CLIENT_ID</code>{' '}
              with your Google Cloud Web Client ID, and restart the dev server.
            </p>
          </BentoCard>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-spend-exceeded/12 border border-spend-exceeded/25 px-4 py-3 text-xs text-spend-exceeded"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void signIn()}
          disabled={!isConfigured || isSigningIn}
          className="w-full rounded-full bg-spend-accent text-spend-bg py-3.5 px-5 font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-bg"
        >
          {isSigningIn ? (
            <>
              <Loader2
                className={cn(
                  'h-4 w-4 shrink-0',
                  !shouldReduceMotion && 'animate-spin',
                )}
                aria-hidden="true"
              />
              <span>Connecting Google...</span>
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21.805 10.023H12v3.955h5.617c-.242 1.272-.98 2.35-2.087 3.074v2.556h3.377c1.976-1.82 3.118-4.502 3.118-7.685 0-.65-.06-1.275-.22-1.9Z" />
                <path d="M12 22c2.7 0 4.965-.895 6.62-2.418l-3.377-2.556c-.896.601-2.043.956-3.243.956-2.495 0-4.61-1.685-5.367-3.95H3.148v2.633C4.795 19.937 8.133 22 12 22Z" />
                <path d="M6.633 14.032A5.95 5.95 0 0 1 6.316 12c0-.706.122-1.392.317-2.032V7.335H3.148A9.996 9.996 0 0 0 2 12c0 1.613.386 3.14 1.148 4.665l3.485-2.633Z" />
                <path d="M12 6.018c1.468 0 2.785.505 3.823 1.495l2.867-2.867C16.96 3.04 14.696 2 12 2 8.133 2 4.795 4.063 3.148 7.335l3.485 2.633C7.39 7.703 9.505 6.018 12 6.018Z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-spend-muted text-center leading-relaxed">
          Only requests access to SpendTracker&apos;s hidden app data folder in
          your Google Drive.
        </p>

        <footer className="pt-6 pb-2 text-center text-xs text-spend-muted">
          <span>Developed by Danulive</span>
          <span aria-hidden="true" className="mx-1.5">
            ·
          </span>
          <a
            href="https://github.com/danulive"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-spend-text hover:text-spend-accent transition-colors underline-offset-4 hover:underline inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent rounded"
          >
            <span>GitHub</span>
            <ExternalLink
              className="h-3 w-3 inline ml-0.5 -mt-0.5"
              aria-hidden="true"
            />
          </a>
        </footer>
      </div>
    </MobileFrame>
  )
}
