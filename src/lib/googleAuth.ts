import type { TokenResponse } from '../types/google-gis'

export const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'

export interface AuthUser {
  sub: string
  name: string
  email: string
  avatarUrl?: string
}

const PLACEHOLDER_CLIENT_ID =
  'your_google_client_id.apps.googleusercontent.com'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads VITE_GOOGLE_CLIENT_ID and returns "" when unset or left as the example placeholder. */
export function getGoogleClientId(): string {
  const raw = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed || trimmed === PLACEHOLDER_CLIENT_ID) {
    return ''
  }
  return trimmed
}

/** Waits for the Google Identity Services OAuth2 browser script to load. */
export function waitForGoogleGis(timeoutMs = 8000): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google Sign-In requires a browser environment.'),
    )
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const intervalId = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(intervalId)
        resolve()
        return
      }

      if (Date.now() - startTime >= timeoutMs) {
        window.clearInterval(intervalId)
        reject(
          new Error(
            'Google Sign-In failed to load. Check your connection and try again.',
          ),
        )
      }
    }, 100)
  })
}

function mapTokenErrorMessage(response: TokenResponse): string {
  if (response.error === 'access_denied') {
    return 'Google Sign-In permission was denied.'
  }
  if (
    response.error === 'interaction_required' ||
    response.error === 'login_required' ||
    response.error === 'consent_required'
  ) {
    return 'Session expired — please sign in again.'
  }
  return (
    response.error_description ||
    response.error ||
    'Google authentication failed.'
  )
}

/** Requests a browser OAuth2 access token with a 60-second expiry safety buffer. */
export function requestGoogleAccessToken(
  clientId: string,
  options: { prompt: '' | 'select_account'; hint?: string },
): Promise<{ accessToken: string; expiresAt: number }> {
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) {
    return Promise.reject(
      new Error('Google Identity Services is not ready yet.'),
    )
  }

  return new Promise((resolve, reject) => {
    let settled = false

    try {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: (response) => {
          if (settled) {
            return
          }
          settled = true

          if (response.error || !response.access_token) {
            reject(new Error(mapTokenErrorMessage(response)))
            return
          }

          const expiresIn = Number.isFinite(response.expires_in)
            ? response.expires_in
            : 3600
          const expiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000

          resolve({
            accessToken: response.access_token,
            expiresAt,
          })
        },
        error_callback: (error) => {
          if (settled) {
            return
          }
          settled = true

          if (error.type === 'popup_closed') {
            reject(new Error('Sign-in popup was closed before completing.'))
            return
          }
          if (error.type === 'popup_failed_to_open') {
            reject(
              new Error(
                'Sign-in popup was blocked by your browser. Allow popups and try again.',
              ),
            )
            return
          }
          reject(
            new Error(error.message || 'Could not complete Google Sign-In.'),
          )
        },
      })

      client.requestAccessToken({
        prompt: options.prompt,
        ...(options.hint ? { hint: options.hint } : {}),
      })
    } catch (error) {
      if (!settled) {
        settled = true
        reject(
          error instanceof Error
            ? error
            : new Error('Unable to initialize Google Sign-In.'),
        )
      }
    }
  })
}

/** Fetches the authenticated Google user's sub, email, display name, and avatar URL. */
export async function fetchGoogleUserProfile(
  accessToken: string,
): Promise<AuthUser> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Could not load your Google account profile.')
  }

  const data: unknown = await response.json()
  if (!isRecord(data)) {
    throw new Error('Invalid Google profile response.')
  }

  const sub = typeof data.sub === 'string' ? data.sub.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  if (!sub || !email) {
    throw new Error('Google account email is unavailable.')
  }

  const rawName = typeof data.name === 'string' ? data.name.trim() : ''
  const fallbackName = email.split('@')[0] || 'SpendTracker User'
  const avatarUrl =
    typeof data.picture === 'string' && data.picture.trim()
      ? data.picture.trim()
      : undefined

  return {
    sub,
    email,
    name: rawName || fallbackName,
    avatarUrl,
  }
}

/** Safely revokes the active OAuth access token when GIS is loaded. */
export function revokeGoogleToken(accessToken: string): void {
  try {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken)
    }
  } catch {
    // Ignore revocation errors if network or GIS script is unavailable.
  }
}
