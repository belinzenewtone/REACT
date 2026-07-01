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
};

export const SYNC_STATES = {
  PENDING: 'pending',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
} as const;
