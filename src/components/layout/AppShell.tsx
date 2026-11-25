import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { APPLE_FAST_SPRING } from '../../lib/motion'
import type {
  SyncStatus,
  TabId,
  UserProfileSummary,
} from '../../types/navigation'
import { MobileFrame } from '../ui/MobileFrame'
import { BottomTabBar } from './BottomTabBar'
import { DesktopSidebar } from './DesktopSidebar'
import { OfflineSyncBanner } from './OfflineSyncBanner'
import { TopHeader } from './TopHeader'

export interface AppShellProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  syncStatus?: SyncStatus
  user?: UserProfileSummary
  onSyncClick?: () => void
  onAddPaymentClick?: () => void
  children: ReactNode
}

/** Responsive application shell pairing a desktop sidebar with mobile header and bottom tabs. */
export function AppShell({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  syncStatus = 'local',
  user,
  onSyncClick,
  onAddPaymentClick,
  children,
}: AppShellProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <MobileFrame className="pt-0 pb-0 lg:py-6">
      <div className="lg:flex lg:items-start lg:gap-7">
        <DesktopSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          syncStatus={syncStatus}
          user={user}
        />

        <div className="flex-1 min-w-0">
          <TopHeader
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            syncStatus={syncStatus}
            user={user}
            onAvatarClick={() => onTabChange('account')}
            onSyncClick={onSyncClick}
            onAddPaymentClick={onAddPaymentClick}
          />

          <OfflineSyncBanner isVisible={syncStatus === 'offline'} />

          <main id="main" className="pt-2 pb-28 lg:pt-0 lg:pb-8">
            {shouldReduceMotion ? (
              <div key={activeTab}>{children}</div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={APPLE_FAST_SPRING}
              >
                {children}
              </motion.div>
            )}
          </main>
        </div>
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </MobileFrame>
  )
}
