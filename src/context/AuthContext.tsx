import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchGoogleUserProfile,
  getGoogleClientId,
  requestGoogleAccessToken,
  revokeGoogleToken,
  waitForGoogleGis,
  type AuthUser,
} from '../lib/googleAuth'

export type AuthStatus =
  | 'initializing'
  | 'signed_out'
  | 'signing_in'
  | 'authenticated'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  isConfigured: boolean
  signIn: () => Promise<void>
  signOut: () => void
  getValidAccessToken: (options?: {
    interactive?: boolean
    forceRefresh?: boolean
  }) => Promise<string>
}

interface StoredAuthSession {
  user: AuthUser
  accessToken: string
  expiresAt: number
}

const SESSION_STORAGE_KEY = 'spendtracker_auth_session_v1'
const HINT_STORAGE_KEY = 'spendtracker_auth_hint_v1'
const TOKEN_REFRESH_BUFFER_MS = 120_000

const AuthContext = createContext<AuthContextValue | null>(null)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readStoredSession(): StoredAuthSession | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null
    }
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !isRecord(parsed.user)) {
      return null
    }

    const sub =
      typeof parsed.user.sub === 'string' ? parsed.user.sub.trim() : ''
    const email =
      typeof parsed.user.email === 'string' ? parsed.user.email.trim() : ''
    const name =
      typeof parsed.user.name === 'string' ? parsed.user.name.trim() : ''
    const avatarUrl =
      typeof parsed.user.avatarUrl === 'string' && parsed.user.avatarUrl.trim()
        ? parsed.user.avatarUrl.trim()
        : undefined

    const accessToken =
      typeof parsed.accessToken === 'string' ? parsed.accessToken : ''
    const expiresAt =
      typeof parsed.expiresAt === 'number' && Number.isFinite(parsed.expiresAt)
        ? parsed.expiresAt
        : 0

    if (!sub || !email || !name || !accessToken || expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return {
      user: { sub, email, name, avatarUrl },
      accessToken,
      expiresAt,
    }
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredAuthSession): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(session),
      )
    }
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

function clearStoredSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

function readStoredHint(): string | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return undefined
    }
    const raw = window.localStorage.getItem(HINT_STORAGE_KEY)
    if (!raw) {
      return undefined
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      isRecord(parsed) &&
      typeof parsed.email === 'string' &&
      parsed.email.trim()
    ) {
      return parsed.email.trim()
    }
    return undefined
  } catch {
    return undefined
  }
}

function writeStoredHint(email: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify({ email }))
    }
  } catch {
    // Ignore storage failures.
  }
}

function clearStoredHint(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(HINT_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export interface AuthProviderProps {
  children: ReactNode
}

/**
 * Provides Google Identity Services OAuth authentication, session persistence,
 * and silent access token refresh without wiping per-account ledger storage on sign-out.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [initialSession] = useState<StoredAuthSession | null>(() =>
    readStoredSession(),
  )

  const [user, setUser] = useState<AuthUser | null>(
    () => initialSession?.user ?? null,
  )
  const [accessToken, setAccessToken] = useState<string | null>(
    () => initialSession?.accessToken ?? null,
  )
  const [expiresAt, setExpiresAt] = useState<number>(
    () => initialSession?.expiresAt ?? 0,
  )
  const [status, setStatus] = useState<AuthStatus>(() =>
    initialSession ? 'authenticated' : 'signed_out',
  )
  const [error, setError] = useState<string | null>(null)

  const clientId = getGoogleClientId()
  const isConfigured = Boolean(clientId)

  const tokenStateRef = useRef({ accessToken, expiresAt, user })
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

  useEffect(() => {
    tokenStateRef.current = { accessToken, expiresAt, user }
  }, [accessToken, expiresAt, user])

  const signIn = useCallback(async (): Promise<void> => {
    if (!clientId) {
      setError('Missing VITE_GOOGLE_CLIENT_ID in environment configuration.')
      return
    }

    setStatus('signing_in')
    setError(null)

    try {
      await waitForGoogleGis()
      const hint = readStoredHint()
      const tokenResult = await requestGoogleAccessToken(clientId, {
        prompt: 'select_account',
        hint,
      })
      const profile = await fetchGoogleUserProfile(tokenResult.accessToken)

      const session: StoredAuthSession = {
        user: profile,
        accessToken: tokenResult.accessToken,
        expiresAt: tokenResult.expiresAt,
      }

      writeStoredSession(session)
      writeStoredHint(profile.email)

      setUser(profile)
      setAccessToken(tokenResult.accessToken)
      setExpiresAt(tokenResult.expiresAt)
      setStatus('authenticated')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Google Sign-In failed. Please try again.'
      setError(message)
      setStatus('signed_out')
    }
  }, [clientId])

  const signOut = useCallback((): void => {
    const activeToken = tokenStateRef.current.accessToken
    if (activeToken) {
      revokeGoogleToken(activeToken)
    }

    clearStoredSession()
    clearStoredHint()
    refreshPromiseRef.current = null

    setUser(null)
    setAccessToken(null)
    setExpiresAt(0)
    setError(null)
    setStatus('signed_out')
  }, [])

  const getValidAccessToken = useCallback(
    async (options?: {
      interactive?: boolean
      forceRefresh?: boolean
    }): Promise<string> => {
      const current = tokenStateRef.current
      if (
        !options?.forceRefresh &&
        current.accessToken &&
        current.expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS
      ) {
        return current.accessToken
      }

      if (!clientId) {
        throw new Error('Missing VITE_GOOGLE_CLIENT_ID configuration.')
      }

      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current
      }

      const refreshTask = (async () => {
        await waitForGoogleGis()
        const hint = current.user?.email ?? readStoredHint()

        let tokenResult: { accessToken: string; expiresAt: number }
        try {
          tokenResult = await requestGoogleAccessToken(clientId, {
            prompt: '',
            hint,
          })
        } catch {
          if (!options?.interactive) {
            throw new Error('Session expired — please sign in again')
          }
          tokenResult = await requestGoogleAccessToken(clientId, {
            prompt: 'select_account',
            hint,
          })
        }

        const activeUser =
          tokenStateRef.current.user ??
          (await fetchGoogleUserProfile(tokenResult.accessToken))

        writeStoredSession({
          user: activeUser,
          accessToken: tokenResult.accessToken,
          expiresAt: tokenResult.expiresAt,
        })
        writeStoredHint(activeUser.email)

        setUser(activeUser)
        setAccessToken(tokenResult.accessToken)
        setExpiresAt(tokenResult.expiresAt)
        setStatus('authenticated')

        return tokenResult.accessToken
      })()

      refreshPromiseRef.current = refreshTask
      try {
        return await refreshTask
      } finally {
        refreshPromiseRef.current = null
      }
    },
    [clientId],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      isConfigured,
      signIn,
      signOut,
      getValidAccessToken,
    }),
    [
      user,
      status,
      error,
      isConfigured,
      signIn,
      signOut,
      getValidAccessToken,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Accesses Google OAuth authentication state and silent token refresh helpers. */
// oxlint-disable-next-line react/only-export-components -- Co-located with AuthProvider per auth store API.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
