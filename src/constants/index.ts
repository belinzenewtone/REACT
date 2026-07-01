/**
 * App-wide constants.
 */

export const APP_NAME = 'BELTECH';
export const APP_VERSION = '1.0.0';

export const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'] as const;
export const DEFAULT_CURRENCY = 'KES';

export const DATE_FORMATS = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const;
export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';

export const DEFAULT_DECIMAL_PRECISION = 2;

export const BUDGET_THRESHOLDS = {
  safe: 0.5,
  warning: 0.8,
} as const;

export const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant',
  transport: 'car',
  utilities: 'flash',
  groceries: 'cart',
  rent: 'home',
  airtime: 'phone-portrait',
  entertainment: 'film',
  health: 'medical',
  education: 'school',
  shopping: 'bag',
  savings: 'wallet',
  investment: 'trending-up',
  income: 'arrow-down',
  uncategorized: 'help-circle',
  housing: 'home-outline',
  personal_care: 'sparkles-outline',
  subscriptions: 'repeat-outline',
  fuliza: 'cash-outline',
  transfer: 'swap-horizontal-outline',
  withdrawal: 'arrow-up-circle-outline',
  miscellaneous: 'ellipsis-horizontal-circle-outline',
};

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',
  transport: '#3B82F6',
  utilities: '#8B5CF6',
  groceries: '#10B981',
  rent: '#EF4444',
  airtime: '#06B6D4',
  entertainment: '#EC4899',
  health: '#F97316',
  education: '#6366F1',
  shopping: '#D946EF',
  savings: '#22C55E',
  investment: '#14B8A6',
  income: '#34D399',
  uncategorized: '#6B7280',
  housing: '#F43F5E',
  personal_care: '#F472B6',
  subscriptions: '#A78BFA',
  fuliza: '#FB923C',
  transfer: '#60A5FA',
  withdrawal: '#F87171',
  miscellaneous: '#94A3B8',
};

/**
 * Categories offered in the dedicated Categorize wizard (uncategorized-transaction
 * cleanup flow). Mirrors the Kotlin app's categorize category list.
 */
export const CATEGORIZE_CATEGORIES = [
  'food',
  'transport',
  'utilities',
  'entertainment',
  'shopping',
  'health',
  'education',
  'housing',
  'airtime',
  'savings',
  'personal_care',
  'subscriptions',
  'fuliza',
  'transfer',
  'withdrawal',
  'miscellaneous',
] as const;

export const SYNC_STATES = {
  PENDING: 'pending',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
} as const;
