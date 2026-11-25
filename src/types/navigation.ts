/** Primary 4-tab navigation identifiers. */
export type TabId = 'home' | 'analytics' | 'history' | 'account'

/** Cloud and local persistence status shown in TopHeader. */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error'

/** Lightweight signed-in user summary displayed in TopHeader and Account. */
export interface UserProfileSummary {
  name: string
  email?: string
  avatarUrl?: string
}
