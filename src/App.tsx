import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { OnboardingModal } from './components/onboarding/OnboardingModal'
import { AccountScreen } from './components/screens/AccountScreen'
import { AnalyticsScreen } from './components/screens/AnalyticsScreen'
import { HistoryScreen } from './components/screens/HistoryScreen'
import { HomeScreen } from './components/screens/HomeScreen'
import { SignInScreen } from './components/screens/SignInScreen'
import { MobileFrame } from './components/ui/MobileFrame'
import { useAuth } from './context/AuthContext'
import { LedgerProvider, useLedger } from './context/LedgerContext'
import { useDriveSync } from './hooks/useDriveSync'
import type { AuthUser } from './lib/googleAuth'
import type { TabId } from './types/navigation'

interface AuthenticatedAppProps {
  user: AuthUser
  onSignOut: () => void
}

function AuthenticatedApp({ user, onSignOut }: AuthenticatedAppProps) {
  const { ledger } = useLedger()
  const { syncStatus, lastSyncedAt, syncError, isInitialPullDone, syncNow } =
    useDriveSync()
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [searchQuery, setSearchQuery] = useState('')

  const effectiveUser = {
    name: ledger.settings.customDisplayName?.trim() || user.name,
    email: user.email,
    avatarUrl: ledger.settings.customAvatarDataUrl || user.avatarUrl,
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        syncStatus={syncStatus}
        user={effectiveUser}
        onSyncClick={() => void syncNow()}
      >
        {activeTab === 'home' ? (
          <HomeScreen
            searchQuery={searchQuery}
            user={effectiveUser}
            onViewAllHistory={() => setActiveTab('history')}
            onOpenAnalytics={() => setActiveTab('analytics')}
          />
        ) : activeTab === 'analytics' ? (
          <AnalyticsScreen />
        ) : activeTab === 'history' ? (
          <HistoryScreen searchQuery={searchQuery} />
        ) : (
          <AccountScreen
            user={effectiveUser}
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            syncError={syncError}
            onSyncNow={() => void syncNow()}
            onSignOut={onSignOut}
          />
        )}
      </AppShell>

      <OnboardingModal
        isOpen={isInitialPullDone && !ledger.settings.onboardingCompleted}
        userName={effectiveUser.name}
      />
    </>
  )
}

function App() {
  const { user, status, signOut } = useAuth()

  if (status === 'initializing') {
    return (
      <MobileFrame className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center" aria-hidden="true">
            <span className="h-9 w-9 bg-spend-accent rounded-full" />
            <span className="-ml-3 h-9 w-9 bg-spend-text/25 rounded-full border border-spend-text/[0.12]" />
          </div>
          <p className="text-xs text-spend-muted">Loading SpendTracker...</p>
        </div>
      </MobileFrame>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <SignInScreen />
  }

  return (
    <LedgerProvider scopeKey={user.email.toLowerCase()}>
      <AuthenticatedApp user={user} onSignOut={signOut} />
    </LedgerProvider>
  )
}

export default App
