import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { useSQLiteContext } from 'expo-sqlite';
import {
  syncNotificationPermissions,
  syncDailyDigest,
  syncAllNotifications,
  cancelAllNotifications,
} from '../../services/notificationSyncService';
import { checkAllBudgetThresholds } from '../../services/budgetAlertService';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { AlertLevelStepper } from '../../components/settings/AlertLevelStepper';
import { TimePickerModal } from '../../components/settings/TimePickerModal';
import { animateLayout } from '../../utils/animation';
import { spacing } from '../../theme';

export function NotificationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const clearFiredBudgetAlerts = useAppStore((state) => state.clearFiredBudgetAlerts);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = setTimeout(() => setInfoMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [infoMessage]);

  const setAlertThreshold = (key: 'high' | 'medium' | 'low', value: number) => {
    updateSettings({
      alertThresholds: { ...settings.alertThresholds, [key]: value },
    });
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    clearFiredBudgetAlerts(yearMonth);
    checkAllBudgetThresholds(db).catch(() => {});
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={infoMessage ?? ''} visible={!!infoMessage} onDismiss={() => setInfoMessage(null)} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Notifications</Text>
          <View style={{ width: 44 }} />
        </View>

        <GlassCard>
          <SettingsRow
            icon="notifications-outline"
            label="Enable notifications"
            toggle
            toggleValue={settings.notificationsEnabled}
            onToggleChange={async (value) => {
              if (value) {
                const granted = await syncNotificationPermissions();
                if (granted) {
                  await syncAllNotifications(db);
                  setInfoMessage('Notifications enabled');
                } else {
                  setInfoMessage('Please allow notifications in device settings');
                }
              } else {
                updateSettings({ notificationsEnabled: false });
                await cancelAllNotifications();
                setInfoMessage('Notifications disabled');
              }
            }}
            isLast
          />
        </GlassCard>

        <SectionLabel label="Budget Alerts" />
        <GlassCard>
          <SettingsRow
            icon="wallet-outline"
            label="Budget threshold alerts"
            subtitle="Notify when spending exceeds a budget category"
            toggle
            toggleValue={settings.budgetThresholdAlerts}
            onToggleChange={async (value) => {
              animateLayout();
              updateSettings({ budgetThresholdAlerts: value });
              if (value) {
                await checkAllBudgetThresholds(db);
              }
              setInfoMessage(value ? 'Budget alerts enabled' : 'Budget alerts disabled');
            }}
            isLast
          />
        </GlassCard>

        {settings.budgetThresholdAlerts && (
          <>
            <SectionLabel label="Alert Levels" />
            <GlassCard>
              <AlertLevelStepper
                label="High"
                value={settings.alertThresholds.high}
                suffix="%"
                onChange={(value) => setAlertThreshold('high', value)}
              />
              <AlertLevelStepper
                label="Medium"
                value={settings.alertThresholds.medium}
                suffix="%"
                onChange={(value) => setAlertThreshold('medium', value)}
              />
              <AlertLevelStepper
                label="Low"
                value={settings.alertThresholds.low}
                suffix="%"
                onChange={(value) => setAlertThreshold('low', value)}
              />
            </GlassCard>
          </>
        )}

        <SectionLabel label="Daily Digest" />
        <GlassCard>
          <SettingsRow
            icon="sunny-outline"
            label="Morning summary"
            subtitle="Morning summary of tasks, spending and upcoming events"
            toggle
            toggleValue={settings.dailyDigestMorningSummary}
            onToggleChange={async (value) => {
              updateSettings({ dailyDigestMorningSummary: value });
              await syncDailyDigest();
              setInfoMessage(value ? 'Daily digest enabled' : 'Daily digest disabled');
            }}
          />
          <SettingsRow
            icon="time-outline"
            label="Delivery time"
            value={formatTime(settings.dailyDigestDeliveryTime)}
            showChevron
            onPress={() => setTimePickerVisible(true)}
            disabled={!settings.dailyDigestMorningSummary}
            isLast
          />
        </GlassCard>
      </ScrollView>

      <TimePickerModal
        visible={timePickerVisible}
        value={settings.dailyDigestDeliveryTime}
        onCancel={() => setTimePickerVisible(false)}
        onConfirm={async (time) => {
          updateSettings({ dailyDigestDeliveryTime: time });
          setTimePickerVisible(false);
          await syncDailyDigest();
          setInfoMessage(`Daily digest rescheduled for ${formatTime(time)}`);
        }}
      />
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.lg, marginBottom: spacing.base }}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
});
