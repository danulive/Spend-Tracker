import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type MobileFrameProps = ComponentPropsWithoutRef<'div'>

/** Centered mobile-first OLED viewport frame locked to 430px max width. */
export function MobileFrame({
  className,
  children,
  ...props
}: MobileFrameProps) {
  return (
    <div
      className={cn(
        'max-w-[430px] mx-auto min-h-dvh bg-spend-bg relative overflow-x-clip px-4 pb-8 pt-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
