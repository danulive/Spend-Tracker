/** Locked set of 5 expense category identifiers. */
export type CategoryId = 'food' | 'transport' | 'bills' | 'shopping' | 'other'

/** Supported currency codes for user ledger display. */
export type CurrencyCode = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'SGD' | 'AUD'

/** Metadata describing a selectable display currency. */
export interface CurrencyOption {
  code: CurrencyCode
  symbol: string
  label: string
}

/** Single expense entry recorded against the user's wallet. */
export interface Transaction {
  id: string
  /** Positive monetary amount rounded to 2 decimal places. */
  amount: number
  category: CategoryId
  /** False = Essential spend, true = Impulse / Wasted spend. */
  isImpulse: boolean
  note: string
  /** ISO 8601 string representing exact payment time. */
  timestamp: string
  /** Optional ISO 8601 string representing last modification time. */
  updatedAt?: string
}

/** Manual wallet top-up or balance override audit entry. */
export interface WalletAdjustment {
  id: string
  /** Manual top-up ('add') vs. manual balance override ('set'). */
  type: 'add' | 'set'
  /** Signed change applied to the wallet balance. */
  delta: number
  previousBalance: number
  newBalance: number
  note: string
  /** ISO 8601 string representing adjustment time. */
  timestamp: string
}

/** Quick-entry preset chip for frequent expenses. */
export interface FrequentPreset {
  id: string
  label: string
  category: CategoryId
  defaultAmount?: number
  isImpulse: boolean
}

/** User-level currency, budget limit, and onboarding preferences. */
export interface UserSettings {
  currencyCode: CurrencyCode
  currencySymbol: string
  /** Daily spending cap; 0 means no cap is set. */
  dailyLimit: number
  onboardingCompleted: boolean
  customDisplayName?: string
  customAvatarDataUrl?: string
  customPresets?: FrequentPreset[]
}

/** Root persisted ledger document stored locally and synced to Drive. */
export interface LedgerData {
  schemaVersion: 1
  walletBalance: number
  transactions: Transaction[]
  walletAdjustments: WalletAdjustment[]
  settings: UserSettings
  /** ISO 8601 timestamp used for Drive conflict resolution. */
  lastUpdatedAt: string
}
