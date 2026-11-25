import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CloudOff } from 'lucide-react'
import { APPLE_SPRING } from '../../lib/motion'

export interface OfflineSyncBannerProps {
  isVisible: boolean
}

/** Subtle banner shown beneath TopHeader when offline while local storage remains active. */
export function OfflineSyncBanner({ isVisible }: OfflineSyncBannerProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          key="offline-sync-banner"
          role="status"
          aria-live="polite"
          initial={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, height: 'auto' }
          }
          exit={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
          }
          transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
          className="overflow-hidden"
        >
          <div className="mb-3 rounded-2xl bg-spend-surface border border-spend-text/[0.10] px-3.5 py-2.5 flex items-center gap-2.5 text-xs">
            <CloudOff
              className="h-4 w-4 text-spend-muted shrink-0"
              aria-hidden="true"
            />
            <p className="text-spend-muted leading-snug">
              Offline mode — entries are saved locally and will sync to Google
              Drive once you reconnect.
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
