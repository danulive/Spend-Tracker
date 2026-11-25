export interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
}

export interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string; message?: string }) => void
}

export interface OverridableTokenClientConfig {
  prompt?: '' | 'none' | 'consent' | 'select_account'
  hint?: string
}

export interface TokenClient {
  requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void
}

export interface GoogleOAuth2 {
  initTokenClient: (config: TokenClientConfig) => TokenClient
  revoke: (accessToken: string, done?: () => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2
      }
    }
  }
}
