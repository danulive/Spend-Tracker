import { motion, useReducedMotion } from 'framer-motion'
import { CATEGORY_MAP } from '../../constants/categories'
import type { CategorySlice } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import { APPLE_SPRING } from '../../lib/motion'

export interface SegmentedCategoryBarProps {
  slices: CategorySlice[]
  className?: string
}

/** Multi-coloured horizontal segmented pill bar visualizing spending distribution. */
export function SegmentedCategoryBar({
  slices,
  className,
}: SegmentedCategoryBarProps) {
  const shouldReduceMotion = useReducedMotion()

  if (slices.length === 0) {
    return (
      <div
        role="img"
        aria-label="No category spending yet"
        className={cn(
          'h-3.5 w-full rounded-full bg-spend-raised border border-spend-text/[0.06]',
          className,
        )}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label="Category spending breakdown"
      className={cn(
        'flex items-center gap-1 h-4 w-full min-w-0 overflow-hidden',
        className,
      )}
    >
      {slices.map((slice) => {
        const meta = CATEGORY_MAP[slice.category]
        const weight = Math.max(slice.percentage, 6)

        return (
          <motion.div
            key={slice.category}
            layout={!shouldReduceMotion}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : APPLE_SPRING}
            style={{ flexGrow: weight }}
            title={`${meta.label}: ${slice.percentage.toFixed(1)}%`}
            className={cn('h-4 min-w-[10px] rounded-[6px]', meta.bgClass)}
          />
        )
      })}
    </div>
  )
}
