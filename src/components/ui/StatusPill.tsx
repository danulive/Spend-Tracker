import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type StatusPillVariant = 'saved' | 'exceeded' | 'neutral'

export interface StatusPillProps extends ComponentPropsWithoutRef<'span'> {
  variant?: StatusPillVariant
}

const variantClasses: Record<StatusPillVariant, string> = {
  saved: 'bg-spend-saved/15 text-spend-saved',
  exceeded: 'bg-spend-exceeded/15 text-spend-exceeded',
  neutral: 'bg-spend-raised text-spend-muted',
}

/** Compact rounded pill displaying tabular status deltas and indicators. */
export function StatusPill({
  variant = 'neutral',
  className,
  children,
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium leading-none num-tabular',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
