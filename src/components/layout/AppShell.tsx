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
  children: ReactNode
}

/** Persistent mobile application shell framing TopHeader, OfflineSyncBanner, active view, and BottomTabBar. */
export function AppShell({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  syncStatus = 'local',
  user,
  onSyncClick,
  children,
}: AppShellProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <MobileFrame className="pt-0 pb-0">
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        syncStatus={syncStatus}
        user={user}
        onAvatarClick={() => onTabChange('account')}
        onSyncClick={onSyncClick}
      />

      <main id="main" className="pt-2 pb-28">
        <OfflineSyncBanner isVisible={syncStatus === 'offline'} />

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

      <BottomTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </MobileFrame>
  )
}
