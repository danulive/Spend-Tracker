import type {
  CategoryId,
  CurrencyOption,
  FrequentPreset,
} from '../types/ledger'

export type CategoryIconName =
  | 'Utensils'
  | 'Bus'
  | 'Receipt'
  | 'ShoppingBag'
  | 'Sparkles'

/** Visual and semantic metadata for a single expense category. */
export interface CategoryMeta {
  id: CategoryId
  label: string
  shortLabel: string
  hex: string
  bgClass: string
  textClass: string
  iconName: CategoryIconName
}

/** Ordered list of the 5 locked SpendTracker categories. */
export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'food',
    label: 'Food & Dining',
    shortLabel: 'Food',
    hex: '#CCFF00',
    bgClass: 'bg-cat-food',
    textClass: 'text-cat-food',
    iconName: 'Utensils',
  },
  {
    id: 'transport',
    label: 'Transport',
    shortLabel: 'Transport',
    hex: '#FF5A5F',
    bgClass: 'bg-cat-transport',
    textClass: 'text-cat-transport',
    iconName: 'Bus',
  },
  {
    id: 'bills',
    label: 'Bills & Utilities',
    shortLabel: 'Bills',
    hex: '#38BDF8',
    bgClass: 'bg-cat-bills',
    textClass: 'text-cat-bills',
    iconName: 'Receipt',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    shortLabel: 'Shopping',
    hex: '#A855F7',
    bgClass: 'bg-cat-shopping',
    textClass: 'text-cat-shopping',
    iconName: 'ShoppingBag',
  },
  {
    id: 'other',
    label: 'Impulse / Other',
    shortLabel: 'Other',
    hex: '#F2F2F2',
    bgClass: 'bg-cat-other',
    textClass: 'text-cat-other',
    iconName: 'Sparkles',
  },
]

/** Fast O(1) lookup map from CategoryId to locked category metadata. */
export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = {
  food: CATEGORIES[0],
  transport: CATEGORIES[1],
  bills: CATEGORIES[2],
  shopping: CATEGORIES[3],
  other: CATEGORIES[4],
}

/** Supported currency options selectable in settings and onboarding. */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'LKR', symbol: 'Rs.', label: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
]

/** Sensible default quick-add presets for first-time users. */
export const DEFAULT_FREQUENT_PRESETS: FrequentPreset[] = [
  {
    id: 'preset-lunch',
    label: 'Lunch',
    category: 'food',
    isImpulse: false,
  },
  {
    id: 'preset-bus-tuk',
    label: 'Bus / Tuk',
    category: 'transport',
    isImpulse: false,
  },
  {
    id: 'preset-coffee',
    label: 'Coffee',
    category: 'food',
    isImpulse: true,
  },
  {
    id: 'preset-snacks',
    label: 'Snacks',
    category: 'other',
    isImpulse: true,
  },
]
