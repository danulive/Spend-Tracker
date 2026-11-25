import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'min-h-[44px] px-5 py-2.5 rounded-full bg-spend-accent text-spend-bg font-semibold hover:brightness-95',
  secondary:
    'min-h-[44px] px-5 py-2.5 rounded-full bg-spend-raised text-spend-text font-medium border border-spend-text/[0.10] hover:border-spend-text/[0.20]',
  ghost:
    'min-h-[44px] px-4 py-2.5 rounded-full bg-transparent text-spend-muted font-medium hover:text-spend-text',
  icon: 'h-10 w-10 rounded-full bg-spend-raised border border-spend-text/[0.10] flex items-center justify-center text-spend-text hover:border-spend-text/[0.20]',
}

/** Tactile button primitive with instant press scale and accent focus ring. */
export function Button({
  variant = 'primary',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 text-[15px] leading-none select-none cursor-pointer active:scale-[0.97] transition-transform duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spend-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spend-bg disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
