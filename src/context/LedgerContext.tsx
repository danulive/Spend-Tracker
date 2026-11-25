import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { computeLedgerMetrics, type LedgerMetrics } from '../lib/analytics'
import { generateId, roundMoney } from '../lib/format'
import { createEmptyLedger } from '../lib/ledgerFactory'
import { loadLocalLedger, saveLocalLedger } from '../lib/storage'
import type {
  LedgerData,
  Transaction,
  UserSettings,
  WalletAdjustment,
} from '../types/ledger'
import {
  ledgerReducer,
  type AddTransactionInput,
  type UpdateTransactionInput,
  type UpdateWalletAdjustmentInput,
} from './ledgerReducer'

export interface LedgerContextValue {
  ledger: LedgerData
  metrics: LedgerMetrics
  addTransaction: (input: AddTransactionInput) => Transaction
  updateTransaction: (input: UpdateTransactionInput) => void
  deleteTransaction: (id: string) => void
  addWalletFunds: (amount: number, note?: string) => WalletAdjustment
  setWalletBalance: (newBalance: number, note?: string) => WalletAdjustment
  updateWalletAdjustment: (input: UpdateWalletAdjustmentInput) => void
  deleteWalletAdjustment: (id: string) => void
  updateSettings: (partial: Partial<UserSettings>) => void
  replaceLedger: (nextLedger: LedgerData) => void
  resetLedger: () => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

function initializeLedger(scopeKey: string): LedgerData {
  return loadLocalLedger(scopeKey) ?? createEmptyLedger()
}

export interface LedgerProviderProps {
  children: ReactNode
  scopeKey?: string
}

/**
 * Local-first React state provider backed by immediate localStorage persistence
 * and scoped per authenticated account (or "local_guest" before sign-in).
 */
export function LedgerProvider({
  children,
  scopeKey = 'local_guest',
}: LedgerProviderProps) {
  const [ledger, dispatch] = useReducer(
    ledgerReducer,
    scopeKey,
    initializeLedger,
  )
  const activeScopeRef = useRef(scopeKey)

  useEffect(() => {
    if (activeScopeRef.current !== scopeKey) {
      const nextLedger = initializeLedger(scopeKey)
      activeScopeRef.current = scopeKey
      dispatch({ type: 'REPLACE_LEDGER', payload: nextLedger })
    }
  }, [scopeKey])

  useEffect(() => {
    if (activeScopeRef.current === scopeKey) {
      saveLocalLedger(scopeKey, ledger)
    }
  }, [ledger, scopeKey])

  const metrics = useMemo(() => computeLedgerMetrics(ledger), [ledger])

  const addTransaction = useCallback(
    (input: AddTransactionInput): Transaction => {
      const tx: Transaction = {
        id: generateId('tx'),
        amount: roundMoney(input.amount),
        category: input.category,
        isImpulse: input.isImpulse,
        note: input.note.trim(),
        timestamp: input.timestamp ?? new Date().toISOString(),
      }
      dispatch({ type: 'ADD_TRANSACTION', payload: tx })
      return tx
    },
    [],
  )

  const updateTransaction = useCallback((input: UpdateTransactionInput) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: input })
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } })
  }, [])

  const addWalletFunds = useCallback(
    (amount: number, note = ''): WalletAdjustment => {
      const safeAmount = roundMoney(amount)
      const previousBalance = ledger.walletBalance
      const newBalance = roundMoney(previousBalance + safeAmount)
      const timestamp = new Date().toISOString()
      const adjustment: WalletAdjustment = {
        id: generateId('adj'),
        type: 'add',
        delta: safeAmount,
        previousBalance,
        newBalance,
        note: note.trim(),
        timestamp,
      }

      if (safeAmount > 0) {
        dispatch({
          type: 'ADD_WALLET_FUNDS',
          payload: {
            id: adjustment.id,
            amount: safeAmount,
            note: adjustment.note,
            timestamp,
          },
        })
      }

      return adjustment
    },
    [ledger.walletBalance],
  )

  const setWalletBalance = useCallback(
    (newBalance: number, note = ''): WalletAdjustment => {
      const previousBalance = ledger.walletBalance
      const safeBalance = roundMoney(newBalance)
      const delta = roundMoney(safeBalance - previousBalance)
      const timestamp = new Date().toISOString()
      const adjustment: WalletAdjustment = {
        id: generateId('adj'),
        type: 'set',
        delta,
        previousBalance,
        newBalance: safeBalance,
        note: note.trim(),
        timestamp,
      }

      if (Number.isFinite(newBalance)) {
        dispatch({
          type: 'SET_WALLET_BALANCE',
          payload: {
            id: adjustment.id,
            newBalance: safeBalance,
            note: adjustment.note,
            timestamp,
          },
        })
      }

      return adjustment
    },
    [ledger.walletBalance],
  )

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: partial })
  }, [])

  const updateWalletAdjustment = useCallback(
    (input: UpdateWalletAdjustmentInput) => {
      dispatch({ type: 'UPDATE_WALLET_ADJUSTMENT', payload: input })
    },
    [],
  )

  const deleteWalletAdjustment = useCallback((id: string) => {
    dispatch({ type: 'DELETE_WALLET_ADJUSTMENT', payload: { id } })
  }, [])

  const replaceLedger = useCallback((nextLedger: LedgerData) => {
    dispatch({ type: 'REPLACE_LEDGER', payload: nextLedger })
  }, [])

  const resetLedger = useCallback(() => {
    dispatch({ type: 'RESET_LEDGER' })
  }, [])

  const value = useMemo<LedgerContextValue>(
    () => ({
      ledger,
      metrics,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addWalletFunds,
      setWalletBalance,
      updateWalletAdjustment,
      deleteWalletAdjustment,
      updateSettings,
      replaceLedger,
      resetLedger,
    }),
    [
      ledger,
      metrics,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addWalletFunds,
      setWalletBalance,
      updateWalletAdjustment,
      deleteWalletAdjustment,
      updateSettings,
      replaceLedger,
      resetLedger,
    ],
  )

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  )
}

/** Accesses the SpendTracker ledger state, computed metrics, and mutations. */
// oxlint-disable-next-line react/only-export-components -- Co-located with LedgerProvider per store API.
export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext)
  if (!ctx) {
    throw new Error('useLedger must be used within a LedgerProvider')
  }
  return ctx
}
