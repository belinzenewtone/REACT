import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, UIManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import * as Updates from 'expo-updates';
import { DATABASE_NAME, migrateDatabaseAsync } from './src/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { TopBanner } from './src/components/common/TopBanner';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function OtaUpdateBanner() {
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
    <TopBanner
      tone="info"
      message="A new update is ready — tap to restart now"
      visible={updateReady}
      onDismiss={async () => {
        try { await Updates.reloadAsync(); } catch { setUpdateReady(false); }
      }}
    />
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabaseAsync}>
          <AppNavigator />
          <OtaUpdateBanner />
          <StatusBar style="auto" />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
