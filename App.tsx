import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, UIManager, View, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { DATABASE_NAME, migrateDatabaseAsync } from './src/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store';
import { colors, lightColors } from './src/theme';
import { lifeosPaperTheme, lifeosPaperThemeLight } from './src/theme/paperTheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Keep the native splash screen visible until the database and persisted
// stores are ready, then fade it out so the first screen appears smoothly.
SplashScreen.preventAutoHideAsync().catch(() => {});

function SplashHider() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      // Give the navigator one frame to render before fading the splash away.
      requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [hasHydrated]);

  return null;
}

function OtaUpdateModal() {
  const theme = useTheme();
  const [updateReady, setUpdateReady] = useState(false);
  const appState = useRef(AppState.currentState);

  async function checkForUpdate() {
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setUpdateReady(true);
      }
    } catch {
      // Expo Go or network error — silently skip
    }
  }

  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && appState.current !== 'active') {
        checkForUpdate();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <Modal transparent animationType="fade" visible={updateReady} onRequestClose={() => setUpdateReady(false)}>
      <View style={otaStyles.overlay}>
        <View style={[otaStyles.card, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
          <Ionicons name="refresh-circle" size={52} color={theme.colors.primary} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Update Ready
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            A new version has been downloaded. Restart now to apply it.
          </Text>
          <Button
            mode="contained"
            onPress={async () => { try { await Updates.reloadAsync(); } catch { setUpdateReady(false); } }}
            style={{ width: '100%' }}
          >
            Restart Now
          </Button>
          <Button mode="text" onPress={() => setUpdateReady(false)} textColor={theme.colors.onSurfaceVariant}>
            Later
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const otaStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
});

export default function App() {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.settings.theme);

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && (systemColorScheme === 'dark' || systemColorScheme == null));

  const paperTheme = isDark ? lifeosPaperTheme : lifeosPaperThemeLight;
  const bgColor = isDark ? colors.bgPrimary : lightColors.bgPrimary;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabaseAsync}>
            <AppNavigator />
            <SplashHider />
            <OtaUpdateModal />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </SQLiteProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
