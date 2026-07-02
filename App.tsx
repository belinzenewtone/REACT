import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, UIManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { DATABASE_NAME, migrateDatabaseAsync } from './src/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { FulizaLimitModal } from './src/components/settings/FulizaLimitModal';
import { addFulizaLimitNeededListener, setFulizaLimit } from './modules/lifeos-sms';
import { useAppStore } from './src/store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function FulizaLimitPrompt() {
  const [visible, setVisible] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  useEffect(() => {
    const sub = addFulizaLimitNeededListener(() => {
      if (!settings.fulizaLimit || settings.fulizaLimit <= 0) {
        setVisible(true);
      }
    });
    return () => sub.remove();
  }, [settings.fulizaLimit]);

  return (
    <FulizaLimitModal
      visible={visible}
      currentLimit={settings.fulizaLimit}
      onCancel={() => setVisible(false)}
      onSave={(limit) => {
        updateSettings({ fulizaLimit: limit });
        setFulizaLimit(limit).catch(() => null);
        setVisible(false);
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
          <FulizaLimitPrompt />
          <StatusBar style="auto" />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
