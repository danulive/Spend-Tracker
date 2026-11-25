import { BarChart3, CircleUser, Clock, Home, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type {
  SyncStatus,
  TabId,
  UserProfileSummary,
} from '../../types/navigation'
import { UserAvatar } from '../ui/UserAvatar'

export interface DesktopSidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  syncStatus: SyncStatus
  user?: UserProfileSummary
}

interface SidebarNavItem {
  id: TabId
  label: string
  icon: LucideIcon
}

const SIDEBAR_TABS: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'account', label: 'Account', icon: CircleUser },
]

const SYNC_BADGE_META: Record<
  SyncStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  synced: {
    label: 'Synced',
    dotClass: 'bg-spend-accent',
    badgeClass: 'bg-spend-accent/15 text-spend-accent',
  },
  syncing: {
    label: 'Syncing...',
    dotClass: 'bg-spend-accent',
    badgeClass: 'bg-spend-accent/15 text-spend-accent',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-spend-muted',
    badgeClass: 'bg-spend-surface text-spend-muted',
  },
  error: {
    label: 'Sync Error',
    dotClass: 'bg-spend-exceeded',
    badgeClass: 'bg-spend-exceeded/15 text-spend-exceeded',
  },
  local: {
    label: 'Local Only',
    dotClass: 'bg-spend-muted',
    badgeClass: 'bg-spend-surface text-spend-muted',
  },
}

/** Persistent desktop navigation sidebar displayed at lg+ (>= 1024px) viewports. */
export function DesktopSidebar({
  activeTab,
  onTabChange,
  syncStatus,
  user,
}: DesktopSidebarProps) {
  const syncBadge = SYNC_BADGE_META[syncStatus]

  return (
    <aside
      aria-label="Desktop navigation"
      className="hidden lg:flex lg:flex-col lg:justify-between lg:w-[240px] lg:shrink-0 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:rounded-[28px] lg:bg-spend-surface lg:border lg:border-spend-text/[0.10] lg:p-5"
    >
      <div>
        <div className="flex items-center gap-3 px-1 pb-6 border-b border-spend-text/[0.08]">
          <div className="flex items-center shrink-0" aria-hidden="true">
            <span className="h-9 w-9 bg-spend-accent rounded-full" />
            <span className="-ml-3 h-9 w-9 bg-spend-text/25 rounded-full backdrop-blur-sm border border-spend-text/[0.12]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base tracking-[-0.02em] text-spend-text truncate">
              SpendTracker
            </p>
            <p className="text-xs text-spend-muted truncate">Expense Proof</p>
          </div>
        </div>

        <nav aria-label="Primary sections" className="mt-5 space-y-1.5">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                  isActive
                    ? 'bg-spend-accent text-spend-bg font-semibold'
                    : 'text-spend-muted hover:text-spend-text hover:bg-spend-raised',
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={() => onTabChange('account')}
        aria-label="Open account settings"
        className="w-full rounded-[20px] bg-spend-raised border border-spend-text/[0.08] hover:border-spend-text/[0.18] p-3 text-left active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar
            src={user?.avatarUrl}
            name={user?.name}
            size="sm"
            className="border border-spend-text/[0.10]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-spend-text truncate">
              {user?.name ?? 'Local Profile'}
            </p>
            <p className="text-[11px] text-spend-muted truncate">
              {user?.email ?? 'Google connected'}
            </p>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-spend-text/[0.06] flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-spend-muted">
            Drive
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1.5',
              syncBadge.badgeClass,
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', syncBadge.dotClass)}
              aria-hidden="true"
            />
            {syncBadge.label}
          </span>
        </div>
      </button>
    </aside>
  )
}
