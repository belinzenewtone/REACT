import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

// Custom Material 3 theme for the LifeOS preview.
// - Primary accent is cyan (matches the original LifeOS brand).
// - Surfaces are kept dark instead of the default M3 grey/purple tinge.
export const lifeosPaperTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  version: 3,
  isV3: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4DB8FF',
    onPrimary: '#0B0E14',
    primaryContainer: '#004D80',
    onPrimaryContainer: '#B8E6FF',
    secondary: '#8B5CF6',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#3B1F8C',
    onSecondaryContainer: '#DDD6FE',
    tertiary: '#38BDF8',
    onTertiary: '#0B0E14',
    tertiaryContainer: '#004D80',
    onTertiaryContainer: '#B8E6FF',
    surface: '#0B0E14',
    surfaceVariant: '#141A25',
    background: '#0B0E14',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#9CA3AF',
    outline: '#2A303C',
    outlineVariant: '#1F2937',
    error: '#FF6B6B',
    onError: '#0B0E14',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
    inverseSurface: '#E6E0E9',
    inverseOnSurface: '#0B0E14',
    inversePrimary: '#4DB8FF',
    elevation: {
      level0: 'transparent',
      level1: '#0F141D',
      level2: '#121824',
      level3: '#141B26',
      level4: '#161D29',
      level5: '#18202C',
    },
  },
  roundness: 2,
  fonts: {
    ...MD3DarkTheme.fonts,
    headlineLarge: {
      ...MD3DarkTheme.fonts.headlineLarge,
      fontSize: 28,
      lineHeight: 34,
    },
    headlineMedium: {
      ...MD3DarkTheme.fonts.headlineMedium,
      fontSize: 24,
      lineHeight: 30,
    },
    headlineSmall: {
      ...MD3DarkTheme.fonts.headlineSmall,
      fontSize: 20,
      lineHeight: 26,
    },
    titleLarge: {
      ...MD3DarkTheme.fonts.titleLarge,
      fontSize: 18,
      lineHeight: 24,
    },
    titleMedium: {
      ...MD3DarkTheme.fonts.titleMedium,
      fontSize: 16,
      lineHeight: 22,
    },
  },
};
