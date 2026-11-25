import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type MobileFrameProps = ComponentPropsWithoutRef<'div'>

/** Responsive OLED viewport frame: 430px centered column on mobile, 1240px workspace on desktop. */
export function MobileFrame({
  className,
  children,
  ...props
}: MobileFrameProps) {
  return (
    <div
      className={cn(
        'max-w-[430px] mx-auto min-h-dvh bg-spend-bg relative overflow-x-clip px-4 pb-8 pt-4 lg:max-w-[1240px] lg:px-8 lg:py-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
