import type { LedgerData } from '../types/ledger'
import { normalizeLedger } from './ledgerFactory'

/** Returns the namespaced localStorage key for a given account scope. */
export function getStorageKey(scopeKey: string): string {
  return `spendtracker_ledger_v1_${scopeKey}`
}

/**
 * Reads and normalizes the persisted ledger for `scopeKey`.
 * Returns null if absent, unreadable, or invalid JSON (never throws).
 */
export function loadLocalLedger(scopeKey: string): LedgerData | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    const raw = window.localStorage.getItem(getStorageKey(scopeKey))
    if (raw === null) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    return normalizeLedger(parsed)
  } catch {
    return null
  }
}

/**
 * Serializes and saves `ledger` to localStorage under `scopeKey`.
 * Returns false on quota or privacy-mode storage errors without throwing.
 */
export function saveLocalLedger(scopeKey: string, ledger: LedgerData): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }

    window.localStorage.setItem(getStorageKey(scopeKey), JSON.stringify(ledger))
    return true
  } catch {
    return false
  }
}

/** Removes the persisted ledger for `scopeKey` cleanly without throwing. */
export function clearLocalLedger(scopeKey: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    window.localStorage.removeItem(getStorageKey(scopeKey))
  } catch {
    // Ignore storage access errors in restricted browser modes.
  }
}
