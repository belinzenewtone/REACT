/**
 * Design tokens matching the Kotlin LifeOS app.
 * All screenshots are dark-mode-first; light mode is derived by inverting surfaces.
 */

export const colors = {
  // Backgrounds
  bgPrimary: '#0B0E14',
  bgSecondary: '#1A1E26',
  bgElevated: '#1E232D',
  bgTertiary: '#232A36',

  // Accents
  accentPrimary: '#4DB8FF',
  accentSecondary: '#8B5CF6',
  accentTertiary: '#38BDF8',

  // Semantic
  success: '#34D399',
  warning: '#F59E0B',
  danger: '#FF6B6B',
  info: '#4DB8FF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#0B0E14',

  // Borders / dividers
  border: '#2A303C',
  borderSubtle: '#1F2937',

  // Transparent overlays (glassmorphism)
  glassWhite: 'rgba(255, 255, 255, 0.06)',
  glassWhiteStrong: 'rgba(255, 255, 255, 0.12)',
  glassBlack: 'rgba(0, 0, 0, 0.24)',

  // Category palette (matches common expense categories)
  category: {
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
  },

  // Priority
  priority: {
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#EF4444',
  },
} as const;

export const lightColors = {
  ...colors,
  bgPrimary: '#F8FAFC',
  bgSecondary: '#FFFFFF',
  bgElevated: '#F1F5F9',
  bgTertiary: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  glassWhite: 'rgba(255, 255, 255, 0.64)',
  glassWhiteStrong: 'rgba(255, 255, 255, 0.84)',
  glassBlack: 'rgba(0, 0, 0, 0.06)',
} as const;

export type ColorTheme = {
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgTertiary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  glassWhite: string;
  glassWhiteStrong: string;
  glassBlack: string;
  category: Record<string, string>;
  priority: Record<string, string>;
};

export const spacing = {
  /** Screen edge to component gap (matches Kotlin AppSpacing.ScreenHorizontal = 8.dp) */
  screenHorizontal: 8,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  '3xl': 44,
  '4xl': 56,
  // Kept for backward compat — maps to closest Kotlin equivalent
  base: 16,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

/** Bottom safe area to prevent content from being hidden behind the floating tab bar (58dp + offset) */
export const BOTTOM_NAV_SAFE_AREA = 100;

/** Motion durations matching the Kotlin app's AppMotionSpec (fastMs/standardMs/slowMs). */
export const motion = {
  fast: 100,
  standard: 180,
  slow: 260,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
