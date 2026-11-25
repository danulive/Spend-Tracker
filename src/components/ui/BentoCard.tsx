import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type BentoCardVariant = 'default' | 'wallet'

export interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: BentoCardVariant
}

/** Apple Wallet-inspired matte bento card with a 1px hairline border. */
export function BentoCard({
  variant = 'default',
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] bg-spend-surface border border-spend-text/[0.10] p-5',
        variant === 'wallet' &&
          'bg-gradient-to-br from-spend-wallet-from to-spend-wallet-to',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
