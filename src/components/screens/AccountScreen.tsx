import {
  Camera,
  Check,
  LogOut,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { CATEGORIES, CURRENCIES } from '../../constants/categories'
import { useLedger } from '../../context/LedgerContext'
import { cn } from '../../lib/cn'
import { formatPaymentDateTime } from '../../lib/date'
import { formatCurrency, generateId, roundMoney } from '../../lib/format'
import { resizeImageToAvatarDataUrl } from '../../lib/imageResize'
import type { CategoryId, FrequentPreset } from '../../types/ledger'
import type { SyncStatus, UserProfileSummary } from '../../types/navigation'
import { BentoCard } from '../ui/BentoCard'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { StatusPill, type StatusPillVariant } from '../ui/StatusPill'
import { UserAvatar } from '../ui/UserAvatar'

export interface AccountScreenProps {
  user?: UserProfileSummary
  syncStatus: SyncStatus
  lastSyncedAt?: string | null
  syncError?: string | null
  onSyncNow?: () => void
  onSignOut?: () => void
}

const SYNC_PILL_MAP: Record<
  SyncStatus,
  { variant: StatusPillVariant; label: string }
> = {
  synced: { variant: 'saved', label: 'Synced' },
  syncing: { variant: 'neutral', label: 'Syncing...' },
  offline: { variant: 'neutral', label: 'Offline' },
  error: { variant: 'exceeded', label: 'Sync Error' },
  local: { variant: 'neutral', label: 'Local Only' },
}

function parseCapInput(raw: string): number | 'invalid' {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) {
    return 0
  }
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return 'invalid'
  }
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) {
    return 'invalid'
  }
  return roundMoney(value)
}

function parseOptionalPositiveAmount(
  raw: string,
): number | undefined | 'invalid' {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) {
    return undefined
  }
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    return 'invalid'
  }
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value <= 0) {
    return 'invalid'
  }
  return roundMoney(value)
}

/** Account tab managing profile photo/name, Drive sync, currency, daily cap, custom presets, and reset. */
export function AccountScreen({
  user,
  syncStatus,
  lastSyncedAt,
  syncError,
  onSyncNow,
  onSignOut,
}: AccountScreenProps) {
  const { ledger, updateSettings, resetLedger } = useLedger()

  const [syncedLimit, setSyncedLimit] = useState(ledger.settings.dailyLimit)
  const [dailyCapInput, setDailyCapInput] = useState(() =>
    ledger.settings.dailyLimit > 0 ? String(ledger.settings.dailyLimit) : '',
  )
  const [capSaved, setCapSaved] = useState(false)
  const [capError, setCapError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const capTimerRef = useRef<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const [isAddingPreset, setIsAddingPreset] = useState(false)
  const [presetLabel, setPresetLabel] = useState('')
  const [presetAmountInput, setPresetAmountInput] = useState('')
  const [presetCategory, setPresetCategory] = useState<CategoryId>('food')
  const [presetIsImpulse, setPresetIsImpulse] = useState(false)
  const [presetError, setPresetError] = useState('')

  if (ledger.settings.dailyLimit !== syncedLimit) {
    setSyncedLimit(ledger.settings.dailyLimit)
    setDailyCapInput(
      ledger.settings.dailyLimit > 0 ? String(ledger.settings.dailyLimit) : '',
    )
    setCapError('')
  }

  useEffect(() => {
    return () => {
      if (capTimerRef.current !== null) {
        window.clearTimeout(capTimerRef.current)
      }
    }
  }, [])

  const syncPill = SYNC_PILL_MAP[syncStatus]
  const { currencyCode, currencySymbol, dailyLimit } = ledger.settings
  const customPresets = ledger.settings.customPresets ?? []

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setAvatarError('')
    try {
      const dataUrl = await resizeImageToAvatarDataUrl(file, 160)
      updateSettings({ customAvatarDataUrl: dataUrl })
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Unable to upload profile photo.',
      )
    }
  }

  const handleSaveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = nameInput.trim()
    updateSettings({ customDisplayName: trimmed || undefined })
    setIsEditingName(false)
  }

  const handleSaveCap = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = parseCapInput(dailyCapInput)
    if (parsed === 'invalid') {
      setCapError('Enter a valid amount of 0 or more.')
      return
    }

    setCapError('')
    updateSettings({ dailyLimit: parsed })
    setDailyCapInput(parsed > 0 ? String(parsed) : '')
    setSyncedLimit(parsed)

    if (capTimerRef.current !== null) {
      window.clearTimeout(capTimerRef.current)
    }
    setCapSaved(true)
    capTimerRef.current = window.setTimeout(() => {
      setCapSaved(false)
      capTimerRef.current = null
    }, 2000)
  }

  const handleSavePreset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const label = presetLabel.trim()
    if (!label) {
      setPresetError('Enter a preset label.')
      return
    }

    const parsedAmount = parseOptionalPositiveAmount(presetAmountInput)
    if (parsedAmount === 'invalid') {
      setPresetError('Default amount must be greater than 0.')
      return
    }

    const newPreset: FrequentPreset = {
      id: generateId('preset'),
      label: label.slice(0, 40),
      category: presetCategory,
      isImpulse: presetIsImpulse,
      ...(parsedAmount !== undefined ? { defaultAmount: parsedAmount } : {}),
    }

    updateSettings({ customPresets: [...customPresets, newPreset].slice(0, 6) })
    setPresetLabel('')
    setPresetAmountInput('')
    setPresetCategory('food')
    setPresetIsImpulse(false)
    setPresetError('')
    setIsAddingPreset(false)
  }

  const handleRemovePreset = (presetId: string) => {
    const remaining = customPresets.filter((item) => item.id !== presetId)
    updateSettings({
      customPresets: remaining.length > 0 ? remaining : undefined,
    })
  }

  return (
    <div>
      <div className="mb-4 lg:mb-5">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-spend-text">
          Account
        </h1>
        <p className="text-xs text-spend-muted">
          Preferences, daily cap &amp; Drive backup
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        <div className="space-y-3.5 lg:space-y-4">
          <BentoCard className="p-5">
        <div className="flex items-start gap-3.5">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              className="relative rounded-full active:scale-[0.96] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
            >
              <UserAvatar
                src={user?.avatarUrl}
                name={user?.name}
                size="md"
                className="border border-spend-text/[0.10]"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-spend-raised border border-spend-text/[0.15] flex items-center justify-center text-spend-text"
              >
                <Camera className="h-3 w-3" />
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleAvatarFileChange(event)}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="space-y-2">
                <input
                  type="text"
                  maxLength={60}
                  autoFocus
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Display name (blank resets)"
                  aria-label="Custom display name"
                  className="w-full rounded-xl bg-spend-raised border border-spend-text/[0.12] px-3 py-1.5 text-sm text-spend-text placeholder:text-spend-muted focus:outline-none focus:border-spend-accent/70"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-full bg-spend-accent text-spend-bg font-semibold px-3 py-1 text-xs active:scale-[0.97]"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="rounded-full bg-spend-raised text-spend-muted border border-spend-text/[0.10] px-3 py-1 text-xs active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-base font-semibold text-spend-text truncate">
                  {user?.name ?? 'Local Profile'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(user?.name ?? '')
                    setIsEditingName(true)
                  }}
                  aria-label="Edit display name"
                  className="p-1 rounded-full text-spend-muted hover:text-spend-text active:scale-[0.95] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <p className="text-xs text-spend-muted truncate mt-0.5">
              {user?.email ?? 'Google account connected'}
            </p>

            {ledger.settings.customAvatarDataUrl && (
              <button
                type="button"
                onClick={() =>
                  updateSettings({ customAvatarDataUrl: undefined })
                }
                className="text-[11px] text-spend-muted hover:text-spend-text underline mt-1"
              >
                Reset photo
              </button>
            )}
          </div>

          <StatusPill variant={syncPill.variant} className="shrink-0">
            {syncPill.label}
          </StatusPill>
        </div>

        {avatarError && (
          <p role="alert" className="text-[11px] text-spend-exceeded mt-2">
            {avatarError}
          </p>
        )}

        <div className="mt-4 pt-3.5 border-t border-spend-text/[0.08] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-spend-text">
              Google Drive Backup
            </p>
            <p className="text-[11px] text-spend-muted num-tabular truncate mt-0.5">
              {lastSyncedAt
                ? `Last synced ${formatPaymentDateTime(lastSyncedAt)}`
                : 'Synced with hidden Google Drive app folder'}
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={onSyncNow}
            disabled={!onSyncNow || syncStatus === 'syncing'}
            className="min-h-0 px-3.5 py-2 text-xs rounded-full shrink-0"
          >
            Sync Now
          </Button>
        </div>

        {syncError && (
          <p role="alert" className="text-[11px] text-spend-exceeded mt-2">
            {syncError}
          </p>
        )}
      </BentoCard>

      <BentoCard className="p-5 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spend-muted mb-2.5">
            CURRENCY
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((currency) => {
              const isSelected = currency.code === currencyCode
              return (
                <button
                  key={currency.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    updateSettings({
                      currencyCode: currency.code,
                      currencySymbol: currency.symbol,
                    })
                  }
                  className={cn(
                    'rounded-full py-2 px-2.5 text-xs num-tabular transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                    isSelected
                      ? 'bg-spend-accent text-spend-bg font-semibold'
                      : 'bg-spend-raised text-spend-text border border-spend-text/[0.08]',
                  )}
                >
                  {currency.symbol} {currency.code}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-spend-text/[0.08]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="account-cap-input"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spend-muted"
            >
              DAILY SPENDING CAP
            </label>
            <span
              className={cn(
                'text-xs num-tabular font-medium',
                dailyLimit > 0 ? 'text-spend-accent' : 'text-spend-muted',
              )}
            >
              {dailyLimit > 0
                ? `${formatCurrency(dailyLimit, currencySymbol)} / day`
                : 'Disabled'}
            </span>
          </div>

          <form onSubmit={handleSaveCap} className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 rounded-2xl bg-spend-raised border border-spend-text/[0.10] px-3.5 py-2.5 focus-within:border-spend-accent/70 transition-colors">
              <span className="text-sm font-semibold text-spend-muted num-tabular shrink-0">
                {currencySymbol}
              </span>
              <input
                id="account-cap-input"
                type="text"
                inputMode="decimal"
                value={dailyCapInput}
                onChange={(event) => {
                  setDailyCapInput(event.target.value)
                  if (capError) setCapError('')
                }}
                placeholder="0"
                className="w-full min-w-0 bg-transparent text-sm font-semibold text-spend-text placeholder:text-spend-muted/50 num-tabular focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-spend-accent text-spend-bg font-semibold px-4 py-2.5 text-sm active:scale-[0.97] transition-transform shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-surface"
            >
              {capSaved ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-spend-muted">
            <span>Set to 0 to disable the daily limit bar.</span>
            {dailyLimit > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCapError('')
                  updateSettings({ dailyLimit: 0 })
                }}
                className="text-spend-muted hover:text-spend-text underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent rounded"
              >
                Turn off
              </button>
            )}
          </div>

          {capError && (
            <p role="alert" className="text-xs text-spend-exceeded mt-1.5">
              {capError}
            </p>
          )}
        </div>
      </BentoCard>

      </div>

      <div className="mt-3.5 lg:mt-0 space-y-3.5 lg:space-y-4">
        <BentoCard className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spend-muted">
            QUICK-FILL PRESETS
          </p>
          {customPresets.length < 6 ? (
            <button
              type="button"
              onClick={() => {
                setIsAddingPreset((prev) => !prev)
                setPresetError('')
              }}
              className="text-xs font-medium text-spend-accent flex items-center gap-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent rounded-full px-1"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isAddingPreset ? 'Close' : 'Add Preset'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-spend-muted num-tabular">
              6 / 6 max
            </span>
          )}
        </div>

        {customPresets.length === 0 ? (
          <p className="text-xs text-spend-muted">
            Pin frequent payments here to keep them first in Quick Fill.
          </p>
        ) : (
          <div className="space-y-2">
            {customPresets.map((preset) => {
              const catMeta = CATEGORIES.find((c) => c.id === preset.category)
              return (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-spend-raised/70 border border-spend-text/[0.06] px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        catMeta?.bgClass ?? 'bg-cat-other',
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-spend-text truncate">
                      {preset.label}
                    </span>
                    {preset.defaultAmount !== undefined && (
                      <span className="text-xs text-spend-muted num-tabular shrink-0">
                        {formatCurrency(preset.defaultAmount, currencySymbol)}
                      </span>
                    )}
                    {preset.isImpulse && (
                      <span className="rounded-full bg-spend-exceeded/15 text-spend-exceeded px-1.5 py-0.5 text-[10px] font-semibold leading-none shrink-0">
                        Impulse
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePreset(preset.id)}
                    aria-label={`Remove ${preset.label} preset`}
                    className="p-1.5 rounded-full text-spend-muted hover:text-spend-exceeded active:scale-[0.95] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {isAddingPreset && customPresets.length < 6 && (
          <form
            onSubmit={handleSavePreset}
            className="pt-3 border-t border-spend-text/[0.08] space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                maxLength={40}
                value={presetLabel}
                onChange={(event) => {
                  setPresetLabel(event.target.value)
                  if (presetError) setPresetError('')
                }}
                placeholder="Label (e.g. Tea)"
                aria-label="Preset label"
                className="rounded-xl bg-spend-raised border border-spend-text/[0.10] px-3 py-2 text-xs text-spend-text placeholder:text-spend-muted focus:outline-none focus:border-spend-accent/70"
              />
              <input
                type="text"
                inputMode="decimal"
                value={presetAmountInput}
                onChange={(event) => {
                  setPresetAmountInput(event.target.value)
                  if (presetError) setPresetError('')
                }}
                placeholder={`Amount (${currencySymbol}, optional)`}
                aria-label="Preset default amount"
                className="rounded-xl bg-spend-raised border border-spend-text/[0.10] px-3 py-2 text-xs text-spend-text placeholder:text-spend-muted num-tabular focus:outline-none focus:border-spend-accent/70"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = presetCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setPresetCategory(cat.id)}
                    style={isSelected ? { borderColor: cat.hex } : undefined}
                    className={cn(
                      'h-8 rounded-full px-2.5 text-[11px] flex items-center gap-1 active:scale-[0.97]',
                      isSelected
                        ? 'bg-spend-raised border-2 text-spend-text font-semibold'
                        : 'bg-spend-bg/60 border border-spend-text/[0.08] text-spend-muted',
                    )}
                  >
                    <CategoryIcon
                      category={cat.id}
                      className={cn(
                        'h-3 w-3 shrink-0',
                        isSelected ? cat.textClass : 'text-current',
                      )}
                    />
                    <span>{cat.shortLabel}</span>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-full bg-spend-raised p-1 border border-spend-text/[0.10]">
              <button
                type="button"
                aria-pressed={!presetIsImpulse}
                onClick={() => setPresetIsImpulse(false)}
                className={cn(
                  'rounded-full py-1.5 text-[11px] transition-colors',
                  !presetIsImpulse
                    ? 'bg-spend-accent text-spend-bg font-semibold'
                    : 'text-spend-muted',
                )}
              >
                Essential
              </button>
              <button
                type="button"
                aria-pressed={presetIsImpulse}
                onClick={() => setPresetIsImpulse(true)}
                className={cn(
                  'rounded-full py-1.5 text-[11px] transition-colors',
                  presetIsImpulse
                    ? 'bg-spend-exceeded text-spend-text font-semibold'
                    : 'text-spend-muted',
                )}
              >
                Impulse / Wasted
              </button>
            </div>

            {presetError && (
              <p role="alert" className="text-xs text-spend-exceeded">
                {presetError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-full bg-spend-accent text-spend-bg py-2 text-xs font-semibold active:scale-[0.98]"
              >
                Save Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingPreset(false)
                  setPresetError('')
                }}
                className="rounded-full bg-spend-raised border border-spend-text/[0.10] text-spend-muted px-4 py-2 text-xs active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </BentoCard>

      <BentoCard className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spend-muted">
          LEDGER STORAGE
        </p>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-spend-raised/70 border border-spend-text/[0.06] p-3">
            <p className="text-xs text-spend-muted">Payments Logged</p>
            <p className="num-tabular font-bold text-lg text-spend-text mt-0.5">
              {ledger.transactions.length}
            </p>
          </div>
          <div className="rounded-2xl bg-spend-raised/70 border border-spend-text/[0.06] p-3">
            <p className="text-xs text-spend-muted">Wallet Updates</p>
            <p className="num-tabular font-bold text-lg text-spend-text mt-0.5">
              {ledger.walletAdjustments.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateSettings({ onboardingCompleted: false })}
          className="mt-3.5 w-full rounded-full py-2.5 text-xs font-medium bg-spend-raised border border-spend-text/[0.10] text-spend-text active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
        >
          Re-open Setup Wizard
        </button>

        <div className="mt-3 pt-3 border-t border-spend-text/[0.08]">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full rounded-full py-3 text-xs font-semibold text-spend-exceeded bg-spend-exceeded/10 border border-spend-exceeded/20 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-exceeded"
            >
              Reset Local Ledger Data
            </button>
          ) : (
            <div>
              <p className="text-xs text-spend-muted mb-2.5 text-center">
                This clears your local wallet balance, payments, and audit log.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-0 py-2.5 text-xs rounded-full w-full"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    resetLedger()
                    setConfirmReset(false)
                  }}
                  className="rounded-full py-2.5 text-xs font-semibold bg-spend-exceeded text-spend-text active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-exceeded"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </BentoCard>

      <button
        type="button"
        onClick={onSignOut}
        disabled={!onSignOut}
        className="mt-0.5 lg:mt-0 w-full rounded-full py-3.5 text-sm font-medium bg-spend-surface border border-spend-text/[0.10] text-spend-text flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>
          {onSignOut
            ? 'Sign Out of Google'
            : 'Sign Out (Connects in Problem 13)'}
        </span>
      </button>
      </div>
      </div>
    </div>
  )
}
