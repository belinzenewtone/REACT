import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
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
import { SliderRow } from '../../components/settings/SliderRow';
import { TimePickerModal } from '../../components/settings/TimePickerModal';
import { animateLayout } from '../../utils/animation';
import { spacing, typography } from '../../theme';

export function NotificationsScreen() {
  const colors = useThemeColors();
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
    // Allow re-evaluation at the new threshold level for the current month.
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    clearFiredBudgetAlerts(yearMonth);
    // Re-check thresholds with the new value so an alert can fire immediately
    // if the user just lowered a level below current spend.
    checkAllBudgetThresholds(db).catch(() => {});
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={infoMessage ?? ''} visible={!!infoMessage} onDismiss={() => setInfoMessage(null)} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Notifications</Text>
          <View style={{ width: 24 }} />
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
              <SliderRow
                label="High"
                value={settings.alertThresholds.high}
                minimumValue={10}
                maximumValue={100}
                step={5}
                suffix="%"
                onValueChange={(value) => setAlertThreshold('high', value)}
              />
              <SliderRow
                label="Medium"
                value={settings.alertThresholds.medium}
                minimumValue={10}
                maximumValue={100}
                step={5}
                suffix="%"
                onValueChange={(value) => setAlertThreshold('medium', value)}
              />
              <SliderRow
                label="Low"
                value={settings.alertThresholds.low}
                minimumValue={10}
                maximumValue={100}
                step={5}
                suffix="%"
                onValueChange={(value) => setAlertThreshold('low', value)}
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
  const colors = useThemeColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
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
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
});
