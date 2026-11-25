import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useAuth } from '../context/AuthContext'
import { useLedger } from '../context/LedgerContext'
import {
  DriveAuthError,
  reconcileDriveLedger,
  updateLedgerFile,
  type ReconcileDriveResult,
} from '../lib/googleDrive'
import type { LedgerData } from '../types/ledger'
import type { SyncStatus } from '../types/navigation'

export interface UseDriveSyncResult {
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  syncError: string | null
  isInitialPullDone: boolean
  syncNow: () => Promise<void>
}

const PUSH_DEBOUNCE_MS = 1200

function subscribeOnlineStatus(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function getServerOnlineSnapshot(): boolean {
  return true
}

/**
 * Synchronizes the local-first ledger with Google Drive appDataFolder via
 * initial reconciliation, timestamp conflict resolution, and debounced auto-push.
 */
export function useDriveSync(): UseDriveSyncResult {
  const { user, getValidAccessToken } = useAuth()
  const { ledger, replaceLedger } = useLedger()
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  )

  const [syncState, setSyncState] = useState<SyncStatus>(() =>
    getOnlineSnapshot() ? 'syncing' : 'offline',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isInitialPullDone, setIsInitialPullDone] = useState(false)

  const fileIdRef = useRef<string | null>(null)
  const lastSyncedTimestampRef = useRef<string | null>(null)
  const latestLedgerRef = useRef<LedgerData>(ledger)
  const debounceTimerRef = useRef<number | null>(null)
  const isSyncingRef = useRef(false)
  const pendingPushRef = useRef(false)
  const wasOnlineRef = useRef(isOnline)

  const syncStatus: SyncStatus = isOnline ? syncState : 'offline'
  const syncStatusRef = useRef<SyncStatus>(syncStatus)

  useEffect(() => {
    latestLedgerRef.current = ledger
  }, [ledger])

  useEffect(() => {
    syncStatusRef.current = syncStatus
  }, [syncStatus])

  const runWithTokenRetry = useCallback(
    async <T>(
      interactiveFallback: boolean,
      operation: (token: string) => Promise<T>,
    ): Promise<T> => {
      const token = await getValidAccessToken({
        interactive: interactiveFallback,
      })
      try {
        return await operation(token)
      } catch (err) {
        if (err instanceof DriveAuthError) {
          const refreshedToken = await getValidAccessToken({
            interactive: interactiveFallback,
            forceRefresh: true,
          })
          return await operation(refreshedToken)
        }
        throw err
      }
    },
    [getValidAccessToken],
  )

  const applyReconcileResult = useCallback(
    (result: ReconcileDriveResult) => {
      fileIdRef.current = result.fileId
      lastSyncedTimestampRef.current = result.resolvedLedger.lastUpdatedAt
      if (result.action === 'pulled_remote') {
        replaceLedger(result.resolvedLedger)
      }
      pendingPushRef.current = false
      setLastSyncedAt(new Date().toISOString())
      setSyncState('synced')
      setSyncError(null)
    },
    [replaceLedger],
  )

  const userEmail = user?.email ?? ''

  // Initial pull and conflict reconciliation whenever the signed-in account changes.
  useEffect(() => {
    if (!userEmail) {
      return
    }

    let cancelled = false
    fileIdRef.current = null
    lastSyncedTimestampRef.current = null
    pendingPushRef.current = false
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const runInitialPull = async () => {
      setIsInitialPullDone(false)
      setSyncError(null)

      if (!getOnlineSnapshot()) {
        setSyncState('offline')
        setIsInitialPullDone(true)
        return
      }

      setSyncState('syncing')
      isSyncingRef.current = true

      try {
        const result = await runWithTokenRetry(false, (token) =>
          reconcileDriveLedger(token, latestLedgerRef.current),
        )
        if (cancelled) {
          return
        }
        applyReconcileResult(result)
      } catch (err) {
        if (cancelled) {
          return
        }
        setSyncState(getOnlineSnapshot() ? 'error' : 'offline')
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Unable to sync with Google Drive.',
        )
      } finally {
        isSyncingRef.current = false
        if (!cancelled) {
          setIsInitialPullDone(true)
        }
      }
    }

    void runInitialPull()

    return () => {
      cancelled = true
      isSyncingRef.current = false
    }
  }, [userEmail, runWithTokenRetry, applyReconcileResult])

  // Debounced auto-push whenever local ledger mutations advance lastUpdatedAt.
  useEffect(() => {
    if (!isInitialPullDone || !userEmail) {
      return
    }

    if (ledger.lastUpdatedAt === lastSyncedTimestampRef.current) {
      return
    }

    if (!isOnline) {
      pendingPushRef.current = true
      return
    }

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
    }

    const schedulePush = () => {
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null

        const performPush = async () => {
          if (isSyncingRef.current) {
            pendingPushRef.current = true
            return
          }

          if (!getOnlineSnapshot()) {
            pendingPushRef.current = true
            setSyncState('offline')
            return
          }

          isSyncingRef.current = true
          setSyncState('syncing')
          setSyncError(null)

          const snapshot = latestLedgerRef.current

          try {
            if (fileIdRef.current) {
              const targetFileId = fileIdRef.current
              await runWithTokenRetry(false, (token) =>
                updateLedgerFile(token, targetFileId, snapshot),
              )
              lastSyncedTimestampRef.current = snapshot.lastUpdatedAt
              pendingPushRef.current = false
              setLastSyncedAt(new Date().toISOString())
              setSyncState('synced')
              setSyncError(null)
            } else {
              const result = await runWithTokenRetry(false, (token) =>
                reconcileDriveLedger(token, snapshot),
              )
              applyReconcileResult(result)
            }
          } catch (err) {
            pendingPushRef.current = true
            setSyncState(getOnlineSnapshot() ? 'error' : 'offline')
            setSyncError(
              err instanceof Error
                ? err.message
                : 'Failed to save changes to Google Drive.',
            )
          } finally {
            isSyncingRef.current = false
            if (
              latestLedgerRef.current.lastUpdatedAt !==
                lastSyncedTimestampRef.current &&
              pendingPushRef.current &&
              getOnlineSnapshot()
            ) {
              schedulePush()
            }
          }
        }

        void performPush()
      }, PUSH_DEBOUNCE_MS)
    }

    schedulePush()

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [
    ledger.lastUpdatedAt,
    isInitialPullDone,
    userEmail,
    isOnline,
    runWithTokenRetry,
    applyReconcileResult,
  ])

  const syncNow = useCallback(async (): Promise<void> => {
    if (isSyncingRef.current || !userEmail) {
      return
    }

    if (!getOnlineSnapshot()) {
      setSyncState('offline')
      setSyncError('You are offline. Changes are saved locally.')
      return
    }

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    isSyncingRef.current = true
    setSyncState('syncing')
    setSyncError(null)

    try {
      const result = await runWithTokenRetry(true, (token) =>
        reconcileDriveLedger(token, latestLedgerRef.current),
      )
      applyReconcileResult(result)
      setIsInitialPullDone(true)
    } catch (err) {
      setSyncState(getOnlineSnapshot() ? 'error' : 'offline')
      setSyncError(
        err instanceof Error
          ? err.message
          : 'Google Drive sync failed. Please try again.',
      )
    } finally {
      isSyncingRef.current = false
    }
  }, [userEmail, runWithTokenRetry, applyReconcileResult])

  // Auto-reconcile when transitioning back online after offline/error edits.
  useEffect(() => {
    const cameBackOnline = !wasOnlineRef.current && isOnline
    wasOnlineRef.current = isOnline

    if (
      cameBackOnline &&
      (pendingPushRef.current ||
        syncStatusRef.current === 'offline' ||
        syncStatusRef.current === 'error')
    ) {
      void syncNow()
    }
  }, [isOnline, syncNow])

  return {
    syncStatus,
    lastSyncedAt,
    syncError,
    isInitialPullDone,
    syncNow,
  }
}
