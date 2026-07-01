import { useColorScheme } from 'react-native';
import { useAppStore } from '../store';
import { colors, lightColors, type ColorTheme } from '../theme';

export function useThemeColors(): ColorTheme {
  const systemScheme = useColorScheme();
  const themeSetting = useAppStore((state) => state.settings.theme);

  const effectiveTheme =
    themeSetting === 'system' ? systemScheme ?? 'dark' : themeSetting;

  return effectiveTheme === 'dark' ? colors : lightColors;
}
