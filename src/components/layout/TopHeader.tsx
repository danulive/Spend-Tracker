import { useReducedMotion } from 'framer-motion'
import {
  CloudAlert,
  CloudCheck,
  CloudOff,
  HardDrive,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { SyncStatus, UserProfileSummary } from '../../types/navigation'
import { UserAvatar } from '../ui/UserAvatar'

export interface TopHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  syncStatus: SyncStatus
  user?: UserProfileSummary
  onAvatarClick: () => void
  onSyncClick?: () => void
}

const SYNC_META: Record<
  SyncStatus,
  { title: string; ariaLabel: string; colorClass: string }
> = {
  synced: {
    title: 'Synced with Google Drive',
    ariaLabel: 'Sync status: synced with Google Drive',
    colorClass: 'text-spend-accent',
  },
  syncing: {
    title: 'Syncing with Google Drive',
    ariaLabel: 'Sync status: syncing',
    colorClass: 'text-spend-accent',
  },
  offline: {
    title: 'Offline — changes saved locally',
    ariaLabel: 'Sync status: offline',
    colorClass: 'text-spend-muted',
  },
  error: {
    title: 'Sync error — tap for details',
    ariaLabel: 'Sync status: error',
    colorClass: 'text-spend-exceeded',
  },
  local: {
    title: 'Local storage active — Drive sync coming soon',
    ariaLabel: 'Local storage active — Drive sync coming soon',
    colorClass: 'text-spend-muted',
  },
}

/** Persistent frosted mobile top bar with account avatar, pill search, and sync status. */
export function TopHeader({
  searchQuery,
  onSearchChange,
  syncStatus,
  user,
  onAvatarClick,
  onSyncClick,
}: TopHeaderProps) {
  const shouldReduceMotion = useReducedMotion()
  const syncMeta = SYNC_META[syncStatus]

  const renderSyncIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <CloudCheck
            className={cn('h-4 w-4', syncMeta.colorClass)}
            aria-hidden="true"
          />
        )
      case 'syncing':
        return (
          <RefreshCw
            className={cn(
              'h-4 w-4',
              syncMeta.colorClass,
              !shouldReduceMotion && 'animate-spin',
            )}
            aria-hidden="true"
          />
        )
      case 'offline':
        return (
          <CloudOff
            className={cn('h-4 w-4', syncMeta.colorClass)}
            aria-hidden="true"
          />
        )
      case 'error':
        return (
          <CloudAlert
            className={cn('h-4 w-4', syncMeta.colorClass)}
            aria-hidden="true"
          />
        )
      case 'local':
      default:
        return (
          <HardDrive
            className={cn('h-4 w-4', syncMeta.colorClass)}
            aria-hidden="true"
          />
        )
    }
  }

  return (
    <header className="sticky top-0 z-30 -mx-4 px-4 pb-3 pt-3 bg-spend-bg/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAvatarClick}
          aria-label="Open account"
          className="h-10 w-10 shrink-0 rounded-full border border-spend-text/[0.10] flex items-center justify-center overflow-hidden active:scale-[0.95] transition-transform duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-bg"
        >
          <UserAvatar
            src={user?.avatarUrl}
            name={user?.name}
            size="sm"
          />
        </button>

        <div className="flex-1 min-w-0 h-10 rounded-full bg-spend-raised border border-spend-text/[0.10] px-3.5 flex items-center gap-2 focus-within:border-spend-accent/60 transition-colors">
          <Search
            className="h-4 w-4 shrink-0 text-spend-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search payments..."
            aria-label="Search payments"
            className="text-sm text-spend-text placeholder:text-spend-muted bg-transparent w-full min-w-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="h-6 w-6 -mr-1 shrink-0 rounded-full flex items-center justify-center text-spend-muted hover:text-spend-text active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSyncClick}
          title={syncMeta.title}
          aria-label={syncMeta.ariaLabel}
          className="h-10 w-10 shrink-0 rounded-full bg-spend-raised border border-spend-text/[0.10] relative flex items-center justify-center active:scale-[0.95] transition-transform duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-bg"
        >
          {renderSyncIcon()}
        </button>
      </div>
    </header>
  )
}
