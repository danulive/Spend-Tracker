import { CURRENCIES } from '../constants/categories'
import type {
  CategoryId,
  CurrencyCode,
  FrequentPreset,
  LedgerData,
  Transaction,
  UserSettings,
  WalletAdjustment,
} from '../types/ledger'
import { generateId, roundMoney } from './format'

const VALID_CATEGORIES = new Set<CategoryId>([
  'food',
  'transport',
  'bills',
  'shopping',
  'other',
])

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((item) => [item.code, item]))

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'LKR'
const DEFAULT_CURRENCY_SYMBOL = 'Rs.'
const DEFAULT_DAILY_LIMIT = 1500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }
  return !Number.isNaN(Date.parse(value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function resolveCurrencyCode(value: unknown): CurrencyCode {
  if (typeof value === 'string' && CURRENCY_BY_CODE.has(value as CurrencyCode)) {
    return value as CurrencyCode
  }
  return DEFAULT_CURRENCY_CODE
}

function normalizePreset(raw: unknown): FrequentPreset | null {
  if (!isRecord(raw)) {
    return null
  }

  const label = typeof raw.label === 'string' ? raw.label.trim() : ''
  if (!label) {
    return null
  }

  const category: CategoryId =
    typeof raw.category === 'string' &&
    VALID_CATEGORIES.has(raw.category as CategoryId)
      ? (raw.category as CategoryId)
      : 'other'

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : generateId('preset')

  const isImpulse = typeof raw.isImpulse === 'boolean' ? raw.isImpulse : false

  const preset: FrequentPreset = {
    id,
    label: label.slice(0, 40),
    category,
    isImpulse,
  }

  if (isFiniteNumber(raw.defaultAmount) && roundMoney(raw.defaultAmount) > 0) {
    preset.defaultAmount = roundMoney(raw.defaultAmount)
  }

  return preset
}

function normalizeSettings(raw: unknown): UserSettings {
  const obj = isRecord(raw) ? raw : {}
  const currencyCode = resolveCurrencyCode(obj.currencyCode)
  const matchedCurrency = CURRENCY_BY_CODE.get(currencyCode)
  const currencySymbol =
    typeof obj.currencySymbol === 'string' && obj.currencySymbol.trim()
      ? obj.currencySymbol.trim()
      : (matchedCurrency?.symbol ?? DEFAULT_CURRENCY_SYMBOL)

  const dailyLimit =
    isFiniteNumber(obj.dailyLimit) && obj.dailyLimit >= 0
      ? roundMoney(obj.dailyLimit)
      : DEFAULT_DAILY_LIMIT

  const onboardingCompleted =
    typeof obj.onboardingCompleted === 'boolean'
      ? obj.onboardingCompleted
      : false

  const settings: UserSettings = {
    currencyCode,
    currencySymbol,
    dailyLimit,
    onboardingCompleted,
  }

  if (
    typeof obj.customDisplayName === 'string' &&
    obj.customDisplayName.trim()
  ) {
    settings.customDisplayName = obj.customDisplayName.trim().slice(0, 60)
  }

  if (
    typeof obj.customAvatarDataUrl === 'string' &&
    obj.customAvatarDataUrl.startsWith('data:image/')
  ) {
    settings.customAvatarDataUrl = obj.customAvatarDataUrl
  }

  if (Array.isArray(obj.customPresets)) {
    const normalizedPresets = obj.customPresets
      .map(normalizePreset)
      .filter((item): item is FrequentPreset => item !== null)
      .slice(0, 6)
    if (normalizedPresets.length > 0) {
      settings.customPresets = normalizedPresets
    }
  }

  return settings
}

function normalizeTransaction(raw: unknown): Transaction | null {
  if (!isRecord(raw)) {
    return null
  }

  if (!isFiniteNumber(raw.amount) || !isValidIsoDate(raw.timestamp)) {
    return null
  }

  const amount = roundMoney(raw.amount)
  if (amount <= 0) {
    return null
  }

  const category: CategoryId =
    typeof raw.category === 'string' &&
    VALID_CATEGORIES.has(raw.category as CategoryId)
      ? (raw.category as CategoryId)
      : 'other'

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : generateId('tx')

  const note = typeof raw.note === 'string' ? raw.note.trim() : ''
  const isImpulse = typeof raw.isImpulse === 'boolean' ? raw.isImpulse : false

  const tx: Transaction = {
    id,
    amount,
    category,
    isImpulse,
    note,
    timestamp: raw.timestamp,
  }

  if (isValidIsoDate(raw.updatedAt)) {
    tx.updatedAt = raw.updatedAt
  }

  return tx
}

function normalizeWalletAdjustment(raw: unknown): WalletAdjustment | null {
  if (!isRecord(raw)) {
    return null
  }

  if (raw.type !== 'add' && raw.type !== 'set') {
    return null
  }

  if (
    !isFiniteNumber(raw.delta) ||
    !isFiniteNumber(raw.newBalance) ||
    !isValidIsoDate(raw.timestamp)
  ) {
    return null
  }

  const delta = roundMoney(raw.delta)
  const newBalance = roundMoney(raw.newBalance)
  const previousBalance = isFiniteNumber(raw.previousBalance)
    ? roundMoney(raw.previousBalance)
    : roundMoney(newBalance - delta)

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : generateId('adj')

  const note = typeof raw.note === 'string' ? raw.note.trim() : ''

  return {
    id,
    type: raw.type,
    delta,
    previousBalance,
    newBalance,
    note,
    timestamp: raw.timestamp,
  }
}

/** Creates a fresh v1 ledger with safe default settings and empty history. */
export function createEmptyLedger(
  overrides?: Partial<UserSettings>,
): LedgerData {
  const currencyCode = overrides?.currencyCode
    ? resolveCurrencyCode(overrides.currencyCode)
    : DEFAULT_CURRENCY_CODE
  const defaultSymbol =
    CURRENCY_BY_CODE.get(currencyCode)?.symbol ?? DEFAULT_CURRENCY_SYMBOL

  const currencySymbol =
    typeof overrides?.currencySymbol === 'string' &&
    overrides.currencySymbol.trim()
      ? overrides.currencySymbol.trim()
      : defaultSymbol

  const dailyLimit =
    typeof overrides?.dailyLimit === 'number' &&
    Number.isFinite(overrides.dailyLimit) &&
    overrides.dailyLimit >= 0
      ? roundMoney(overrides.dailyLimit)
      : DEFAULT_DAILY_LIMIT

  const settings: UserSettings = {
    currencyCode,
    currencySymbol,
    dailyLimit,
    onboardingCompleted: overrides?.onboardingCompleted ?? false,
  }

  if (overrides?.customDisplayName?.trim()) {
    settings.customDisplayName = overrides.customDisplayName.trim().slice(0, 60)
  }

  if (overrides?.customAvatarDataUrl?.startsWith('data:image/')) {
    settings.customAvatarDataUrl = overrides.customAvatarDataUrl
  }

  if (Array.isArray(overrides?.customPresets) && overrides.customPresets.length > 0) {
    settings.customPresets = overrides.customPresets.slice(0, 6)
  }

  return {
    schemaVersion: 1,
    walletBalance: 0,
    transactions: [],
    walletAdjustments: [],
    settings,
    lastUpdatedAt: new Date().toISOString(),
  }
}

/**
 * Defensively normalizes untrusted JSON from localStorage or Drive into a valid LedgerData object.
 * Never throws; missing fields receive defaults and malformed records are dropped.
 */
export function normalizeLedger(raw: unknown): LedgerData {
  if (!isRecord(raw)) {
    return createEmptyLedger()
  }

  const settings = normalizeSettings(raw.settings)
  const walletBalance = isFiniteNumber(raw.walletBalance)
    ? roundMoney(raw.walletBalance)
    : 0

  const transactions = Array.isArray(raw.transactions)
    ? raw.transactions
        .map(normalizeTransaction)
        .filter((item): item is Transaction => item !== null)
    : []

  const walletAdjustments = Array.isArray(raw.walletAdjustments)
    ? raw.walletAdjustments
        .map(normalizeWalletAdjustment)
        .filter((item): item is WalletAdjustment => item !== null)
    : []

  const lastUpdatedAt = isValidIsoDate(raw.lastUpdatedAt)
    ? raw.lastUpdatedAt
    : new Date().toISOString()

  return {
    schemaVersion: 1,
    walletBalance,
    transactions,
    walletAdjustments,
    settings,
    lastUpdatedAt,
  }
}
