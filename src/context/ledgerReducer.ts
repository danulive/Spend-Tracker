import { CURRENCIES } from '../constants/categories'
import { generateId, roundMoney } from '../lib/format'
import { createEmptyLedger, normalizeLedger } from '../lib/ledgerFactory'
import type {
  CategoryId,
  LedgerData,
  Transaction,
  UserSettings,
  WalletAdjustment,
} from '../types/ledger'

export interface AddTransactionInput {
  amount: number
  category: CategoryId
  isImpulse: boolean
  note: string
  timestamp?: string
}

export interface UpdateTransactionInput {
  id: string
  amount: number
  category: CategoryId
  isImpulse: boolean
  note: string
  timestamp?: string
}

export interface WalletFundsPayload {
  id?: string
  amount: number
  note?: string
  timestamp?: string
}

export interface SetWalletBalancePayload {
  id?: string
  newBalance: number
  note?: string
  timestamp?: string
}

export interface UpdateWalletAdjustmentInput {
  id: string
  amount: number
  note: string
}

export type LedgerAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: UpdateTransactionInput }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'ADD_WALLET_FUNDS'; payload: WalletFundsPayload }
  | { type: 'SET_WALLET_BALANCE'; payload: SetWalletBalancePayload }
  | { type: 'UPDATE_WALLET_ADJUSTMENT'; payload: UpdateWalletAdjustmentInput }
  | { type: 'DELETE_WALLET_ADJUSTMENT'; payload: { id: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'REPLACE_LEDGER'; payload: LedgerData }
  | { type: 'RESET_LEDGER' }

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((item) => [item.code, item]))

/**
 * Pure state reducer governing all SpendTracker ledger transitions, wallet adjustments,
 * refund/re-charge edits, settings updates, and Drive hydration replacements.
 */
export function ledgerReducer(
  state: LedgerData,
  action: LedgerAction,
): LedgerData {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const safeAmount = roundMoney(action.payload.amount)
      if (safeAmount <= 0) {
        return state
      }

      const nextTx: Transaction = {
        ...action.payload,
        amount: safeAmount,
        note: action.payload.note.trim(),
      }

      return {
        ...state,
        walletBalance: roundMoney(state.walletBalance - safeAmount),
        transactions: [nextTx, ...state.transactions],
        lastUpdatedAt: new Date().toISOString(),
      }
    }

    case 'UPDATE_TRANSACTION': {
      const idx = state.transactions.findIndex(
        (tx) => tx.id === action.payload.id,
      )
      if (idx === -1) {
        return state
      }

      const oldTx = state.transactions[idx]
      const nextAmount = roundMoney(action.payload.amount)
      if (nextAmount <= 0) {
        return state
      }

      const now = new Date().toISOString()
      const updatedTx: Transaction = {
        ...oldTx,
        amount: nextAmount,
        category: action.payload.category,
        isImpulse: action.payload.isImpulse,
        note: action.payload.note.trim(),
        timestamp: action.payload.timestamp ?? oldTx.timestamp,
        updatedAt: now,
      }

      const nextTransactions = state.transactions.slice()
      nextTransactions[idx] = updatedTx

      return {
        ...state,
        walletBalance: roundMoney(
          state.walletBalance + oldTx.amount - updatedTx.amount,
        ),
        transactions: nextTransactions,
        lastUpdatedAt: now,
      }
    }

    case 'DELETE_TRANSACTION': {
      const oldTx = state.transactions.find(
        (tx) => tx.id === action.payload.id,
      )
      if (!oldTx) {
        return state
      }

      return {
        ...state,
        walletBalance: roundMoney(state.walletBalance + oldTx.amount),
        transactions: state.transactions.filter(
          (tx) => tx.id !== action.payload.id,
        ),
        lastUpdatedAt: new Date().toISOString(),
      }
    }

    case 'ADD_WALLET_FUNDS': {
      const safeAmount = roundMoney(action.payload.amount)
      if (safeAmount <= 0) {
        return state
      }

      const previousBalance = state.walletBalance
      const newBalance = roundMoney(previousBalance + safeAmount)
      const timestamp = action.payload.timestamp ?? new Date().toISOString()
      const adjustment: WalletAdjustment = {
        id: action.payload.id ?? generateId('adj'),
        type: 'add',
        delta: safeAmount,
        previousBalance,
        newBalance,
        note: (action.payload.note ?? '').trim(),
        timestamp,
      }

      return {
        ...state,
        walletBalance: newBalance,
        walletAdjustments: [adjustment, ...state.walletAdjustments],
        lastUpdatedAt: timestamp,
      }
    }

    case 'SET_WALLET_BALANCE': {
      if (!Number.isFinite(action.payload.newBalance)) {
        return state
      }

      const previousBalance = state.walletBalance
      const nextBalance = roundMoney(action.payload.newBalance)
      const delta = roundMoney(nextBalance - previousBalance)
      const timestamp = action.payload.timestamp ?? new Date().toISOString()
      const adjustment: WalletAdjustment = {
        id: action.payload.id ?? generateId('adj'),
        type: 'set',
        delta,
        previousBalance,
        newBalance: nextBalance,
        note: (action.payload.note ?? '').trim(),
        timestamp,
      }

      return {
        ...state,
        walletBalance: nextBalance,
        walletAdjustments: [adjustment, ...state.walletAdjustments],
        lastUpdatedAt: timestamp,
      }
    }

    case 'UPDATE_WALLET_ADJUSTMENT': {
      const idx = state.walletAdjustments.findIndex(
        (item) => item.id === action.payload.id,
      )
      if (idx === -1) {
        return state
      }

      const old = state.walletAdjustments[idx]
      if (!Number.isFinite(action.payload.amount)) {
        return state
      }

      let nextDelta: number
      let nextNewBalance: number

      if (old.type === 'add') {
        const safeAmount = roundMoney(action.payload.amount)
        if (safeAmount <= 0) {
          return state
        }
        nextDelta = safeAmount
        nextNewBalance = roundMoney(old.previousBalance + nextDelta)
      } else {
        const safeTarget = roundMoney(action.payload.amount)
        if (safeTarget < 0) {
          return state
        }
        nextNewBalance = safeTarget
        nextDelta = roundMoney(nextNewBalance - old.previousBalance)
      }

      const nextAdjustments = state.walletAdjustments.slice()
      nextAdjustments[idx] = {
        ...old,
        delta: nextDelta,
        newBalance: nextNewBalance,
        note: action.payload.note.trim(),
      }

      return {
        ...state,
        walletBalance: roundMoney(
          state.walletBalance + (nextDelta - old.delta),
        ),
        walletAdjustments: nextAdjustments,
        lastUpdatedAt: new Date().toISOString(),
      }
    }

    case 'DELETE_WALLET_ADJUSTMENT': {
      const old = state.walletAdjustments.find(
        (item) => item.id === action.payload.id,
      )
      if (!old) {
        return state
      }

      return {
        ...state,
        walletBalance: roundMoney(state.walletBalance - old.delta),
        walletAdjustments: state.walletAdjustments.filter(
          (item) => item.id !== action.payload.id,
        ),
        lastUpdatedAt: new Date().toISOString(),
      }
    }

    case 'UPDATE_SETTINGS': {
      const partial = action.payload
      const matchedCurrency =
        partial.currencyCode && CURRENCY_BY_CODE.get(partial.currencyCode)
      const nextCurrencyCode = matchedCurrency
        ? matchedCurrency.code
        : state.settings.currencyCode

      const nextCurrencySymbol =
        typeof partial.currencySymbol === 'string' &&
        partial.currencySymbol.trim()
          ? partial.currencySymbol.trim()
          : matchedCurrency
            ? matchedCurrency.symbol
            : state.settings.currencySymbol

      const nextDailyLimit =
        typeof partial.dailyLimit === 'number' &&
        Number.isFinite(partial.dailyLimit) &&
        partial.dailyLimit >= 0
          ? roundMoney(partial.dailyLimit)
          : state.settings.dailyLimit

      const nextOnboarding =
        typeof partial.onboardingCompleted === 'boolean'
          ? partial.onboardingCompleted
          : state.settings.onboardingCompleted

      const nextCustomName =
        'customDisplayName' in partial
          ? typeof partial.customDisplayName === 'string' &&
            partial.customDisplayName.trim()
            ? partial.customDisplayName.trim().slice(0, 60)
            : undefined
          : state.settings.customDisplayName

      const nextCustomAvatar =
        'customAvatarDataUrl' in partial
          ? typeof partial.customAvatarDataUrl === 'string' &&
            partial.customAvatarDataUrl.startsWith('data:image/')
            ? partial.customAvatarDataUrl
            : undefined
          : state.settings.customAvatarDataUrl

      const nextCustomPresets =
        'customPresets' in partial
          ? Array.isArray(partial.customPresets) &&
            partial.customPresets.length > 0
            ? partial.customPresets.slice(0, 6)
            : undefined
          : state.settings.customPresets

      const nextSettings: UserSettings = {
        currencyCode: nextCurrencyCode,
        currencySymbol: nextCurrencySymbol,
        dailyLimit: nextDailyLimit,
        onboardingCompleted: nextOnboarding,
      }

      if (nextCustomName) {
        nextSettings.customDisplayName = nextCustomName
      }
      if (nextCustomAvatar) {
        nextSettings.customAvatarDataUrl = nextCustomAvatar
      }
      if (nextCustomPresets) {
        nextSettings.customPresets = nextCustomPresets
      }

      return {
        ...state,
        settings: nextSettings,
        lastUpdatedAt: new Date().toISOString(),
      }
    }

    case 'REPLACE_LEDGER':
      return normalizeLedger(action.payload)

    case 'RESET_LEDGER':
      return createEmptyLedger(state.settings)

    default:
      return state
  }
}
