import { normalizeLedger } from './ledgerFactory'
import type { LedgerData } from '../types/ledger'

export const LEDGER_FILENAME = 'finance_ledger.json'

export interface DriveFileMeta {
  id: string
  name?: string
  modifiedTime?: string
}

export type ReconcileAction =
  | 'created_remote'
  | 'pulled_remote'
  | 'pushed_local'
  | 'in_sync'

export interface ReconcileDriveResult {
  fileId: string
  resolvedLedger: LedgerData
  action: ReconcileAction
}

/** Error raised when Google Drive rejects the OAuth access token (HTTP 401/403). */
export class DriveAuthError extends Error {
  constructor(message = 'Google Drive authorization expired.') {
    super(message)
    this.name = 'DriveAuthError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function assertDriveOk(
  response: Response,
  fallbackMessage: string,
): Promise<void> {
  if (response.ok) {
    return
  }

  if (response.status === 401 || response.status === 403) {
    throw new DriveAuthError(
      `Google Drive authorization rejected (HTTP ${response.status}).`,
    )
  }

  let detail = ''
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload) && isRecord(payload.error)) {
      if (typeof payload.error.message === 'string') {
        detail = payload.error.message
      }
    }
  } catch {
    // Ignore non-JSON error bodies.
  }

  throw new Error(detail || `${fallbackMessage} (HTTP ${response.status}).`)
}

/**
 * Returns true only for an untouched default ledger so a fresh browser or device
 * never overwrites an existing remote Drive ledger.
 */
export function isEmptyPristineLedger(ledger: LedgerData): boolean {
  return (
    ledger.walletBalance === 0 &&
    ledger.transactions.length === 0 &&
    ledger.walletAdjustments.length === 0 &&
    !ledger.settings.onboardingCompleted
  )
}

/** Queries the user's hidden Drive appDataFolder for the most recent finance_ledger.json. */
export async function findLedgerFile(
  accessToken: string,
): Promise<DriveFileMeta | null> {
  const url =
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'finance_ledger.json'%20and%20trashed%3Dfalse&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=1"

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  await assertDriveOk(response, 'Failed to search Google Drive appDataFolder')

  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.files) || data.files.length === 0) {
    return null
  }

  const first: unknown = data.files[0]
  if (!isRecord(first) || typeof first.id !== 'string' || !first.id) {
    return null
  }

  return {
    id: first.id,
    name: typeof first.name === 'string' ? first.name : undefined,
    modifiedTime:
      typeof first.modifiedTime === 'string' ? first.modifiedTime : undefined,
  }
}

/** Downloads and defensively normalizes finance_ledger.json from Google Drive. */
export async function downloadLedgerFile(
  accessToken: string,
  fileId: string,
): Promise<LedgerData> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  await assertDriveOk(response, 'Failed to download ledger from Google Drive')

  const raw: unknown = await response.json()
  return normalizeLedger(raw)
}

/** Creates a new finance_ledger.json file inside the user's hidden appDataFolder. */
export async function createLedgerFile(
  accessToken: string,
  ledger: LedgerData,
): Promise<{ id: string }> {
  const boundary = `spendtracker_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const metadata = JSON.stringify({
    name: LEDGER_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  })

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(ledger),
    `--${boundary}--`,
    '',
  ].join('\r\n')

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )

  await assertDriveOk(response, 'Failed to create ledger file in Google Drive')

  const data: unknown = await response.json()
  if (!isRecord(data) || typeof data.id !== 'string' || !data.id) {
    throw new Error('Google Drive did not return a file id after creation.')
  }

  return { id: data.id }
}

/** Overwrites an existing finance_ledger.json file in Google Drive using media upload. */
export async function updateLedgerFile(
  accessToken: string,
  fileId: string,
  ledger: LedgerData,
): Promise<void> {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(ledger),
  })

  await assertDriveOk(response, 'Failed to update ledger file in Google Drive')
}

/**
 * Reconciles the local ledger against Google Drive appDataFolder:
 * - Creates remote file when none exists.
 * - Always prefers non-empty remote data over an untouched empty local ledger.
 * - Otherwise compares ISO lastUpdatedAt timestamps (newest wins).
 */
export async function reconcileDriveLedger(
  accessToken: string,
  localLedger: LedgerData,
): Promise<ReconcileDriveResult> {
  const file = await findLedgerFile(accessToken)
  if (!file) {
    const created = await createLedgerFile(accessToken, localLedger)
    return {
      fileId: created.id,
      resolvedLedger: localLedger,
      action: 'created_remote',
    }
  }

  const remoteLedger = await downloadLedgerFile(accessToken, file.id)

  if (
    isEmptyPristineLedger(localLedger) &&
    !isEmptyPristineLedger(remoteLedger)
  ) {
    return {
      fileId: file.id,
      resolvedLedger: remoteLedger,
      action: 'pulled_remote',
    }
  }

  const remoteTime = Date.parse(remoteLedger.lastUpdatedAt) || 0
  const localTime = Date.parse(localLedger.lastUpdatedAt) || 0

  if (remoteTime > localTime) {
    return {
      fileId: file.id,
      resolvedLedger: remoteLedger,
      action: 'pulled_remote',
    }
  }

  if (localTime > remoteTime) {
    await updateLedgerFile(accessToken, file.id, localLedger)
    return {
      fileId: file.id,
      resolvedLedger: localLedger,
      action: 'pushed_local',
    }
  }

  return {
    fileId: file.id,
    resolvedLedger: localLedger,
    action: 'in_sync',
  }
}
