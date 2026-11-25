import { CATEGORY_MAP } from '../../constants/categories'
import type { CategorySlice } from '../../lib/analytics'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { SegmentedCategoryBar } from '../bento/SegmentedCategoryBar'
import { BentoCard } from '../ui/BentoCard'
import { CategoryIcon } from '../ui/CategoryIcon'

export interface CategoryBreakdownCardProps {
  slices: CategorySlice[]
  currencySymbol: string
  periodTitle: string
}

/** Ranked category spending list paired with the segmented category distribution bar. */
export function CategoryBreakdownCard({
  slices,
  currencySymbol,
  periodTitle,
}: CategoryBreakdownCardProps) {
  return (
    <BentoCard className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-spend-text">
          Categories
        </h2>
        <span className="text-xs text-spend-muted">{periodTitle}</span>
      </div>

      <SegmentedCategoryBar slices={slices} className="mt-3.5" />

      {slices.length === 0 ? (
        <p className="text-xs text-spend-muted py-3 text-center mt-2">
          No category spending recorded in this period.
        </p>
      ) : (
        <div className="mt-4 space-y-3.5">
          {slices.map((slice) => {
            const meta = CATEGORY_MAP[slice.category]
            return (
              <div key={slice.category}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-spend-raised border border-spend-text/[0.08] flex items-center justify-center shrink-0">
                      <CategoryIcon
                        category={slice.category}
                        className={cn('h-4 w-4', meta.textClass)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-spend-text truncate">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-spend-muted num-tabular">
                        {slice.count}{' '}
                        {slice.count === 1 ? 'payment' : 'payments'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-spend-text num-tabular">
                      {formatCurrency(slice.total, currencySymbol)}
                    </p>
                    <p className="text-[11px] text-spend-muted num-tabular">
                      {slice.percentage}%
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full rounded-full bg-spend-raised overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', meta.bgClass)}
                    style={{ width: `${Math.max(slice.percentage, 3)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </BentoCard>
  )
}
