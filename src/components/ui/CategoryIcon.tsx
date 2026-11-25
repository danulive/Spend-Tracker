import { Bus, Receipt, ShoppingBag, Sparkles, Utensils } from 'lucide-react'
import type { CategoryId } from '../../types/ledger'

export interface CategoryIconProps {
  category: CategoryId
  className?: string
}

/** Maps a SpendTracker CategoryId to its locked Lucide vector icon. */
export function CategoryIcon({ category, className }: CategoryIconProps) {
  switch (category) {
    case 'food':
      return <Utensils className={className} aria-hidden="true" />
    case 'transport':
      return <Bus className={className} aria-hidden="true" />
    case 'bills':
      return <Receipt className={className} aria-hidden="true" />
    case 'shopping':
      return <ShoppingBag className={className} aria-hidden="true" />
    case 'other':
      return <Sparkles className={className} aria-hidden="true" />
  }
}
