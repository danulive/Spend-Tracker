import { motion, useReducedMotion } from 'framer-motion'
import { BarChart3, CircleUser, Clock, Home, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { APPLE_SPRING } from '../../lib/motion'
import type { TabId } from '../../types/navigation'

export interface BottomTabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

interface NavTabItem {
  id: TabId
  label: string
  icon: LucideIcon
}

const NAV_TABS: NavTabItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'account', label: 'Account', icon: CircleUser },
]

/** Fixed iOS-style frosted bottom navigation bar aligned to the 430px frame. */
export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-[430px] mx-auto pointer-events-auto bg-spend-surface/90 backdrop-blur-xl border-t border-spend-text/[0.10] px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav aria-label="Primary navigation" className="grid grid-cols-4 gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl relative active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent',
                  isActive
                    ? 'text-spend-accent'
                    : 'text-spend-muted hover:text-spend-text',
                )}
              >
                {isActive && (
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
                    aria-hidden="true"
                  >
                    {shouldReduceMotion ? (
                      <span className="h-[2.5px] w-6 rounded-full bg-spend-accent" />
                    ) : (
                      <motion.span
                        layoutId="active-tab-pill"
                        transition={APPLE_SPRING}
                        className="h-[2.5px] w-6 rounded-full bg-spend-accent"
                      />
                    )}
                  </span>
                )}
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium tracking-tight">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
