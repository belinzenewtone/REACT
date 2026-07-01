import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SegmentedControl } from '../../components/settings/SegmentedControl';
import { FulizaLimitModal } from '../../components/settings/FulizaLimitModal';
import { APP_NAME, APP_VERSION } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import type { ThemeMode } from '../../theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const setIsAuthenticated = useAppStore((state) => state.setIsAuthenticated);

  const [fulizaVisible, setFulizaVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = setTimeout(() => setInfoMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [infoMessage]);

  const screenLockSubtitle = (() => {
    const parts: string[] = [];
    if (settings.fingerprintEnabled) parts.push('Fingerprint');
    if (settings.pinCode && settings.screenLockEnabled) parts.push('PIN');
    return parts.length ? parts.join(' · ') : 'No lock configured';
  })();

  const notificationsSubtitle = (() => {
    const parts: string[] = [];
    if (settings.budgetThresholdAlerts) parts.push('Budget alerts');
    if (settings.dailyDigestMorningSummary) parts.push('Daily digest');
    return parts.length ? parts.join(' · ') : 'All off';
  })();

  const handleClearData = () => {
    Alert.alert(
      'Clear all local data?',
      'This will reset the app to its initial state. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setIsAuthenticated(false);
            setHasCompletedOnboarding(false);
          },
        },
      ]
    );
  };

  const handleCheckUpdates = () => {
    Alert.alert('App Updates', `You are on the latest version (${APP_VERSION}).`);
  };

  const handleDownloadUpdate = () => {
    Alert.alert('Download Update', 'No update available at this time.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={infoMessage ?? ''} visible={!!infoMessage} onDismiss={() => setInfoMessage(null)} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <SectionLabel label="Appearance" />
        <GlassCard>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(theme) => {
              updateSettings({ theme });
              setInfoMessage(`Theme set to ${THEME_OPTIONS.find((o) => o.value === theme)?.label}`);
            }}
          />
        </GlassCard>

        <SectionLabel label="Security" />
        <GlassCard>
          <SettingsRow
            icon="shield-outline"
            label="Screen lock"
            subtitle={screenLockSubtitle}
            showChevron
            onPress={() => navigation.navigate('ScreenLock')}
          />
          <SettingsRow
            icon="hand-left-outline"
            label="Haptic feedback"
            subtitle="Vibration on actions like completing tasks or deleting items."
            toggle
            toggleValue={settings.hapticFeedback}
            onToggleChange={(value) => {
              updateSettings({ hapticFeedback: value });
              setInfoMessage(value ? 'Haptics enabled' : 'Haptics disabled');
            }}
            isLast
          />
        </GlassCard>

        <SectionLabel label="Notifications" />
        <GlassCard>
          <SettingsRow
            icon="notifications-outline"
            label="Notification settings"
            subtitle={notificationsSubtitle}
            showChevron
            onPress={() => navigation.navigate('Notifications')}
            isLast
          />
        </GlassCard>

        <SectionLabel label="Assistant" />
        <GlassCard>
          <SettingsRow
            icon="sparkles-outline"
            label="Quick suggestions"
            subtitle="Allow the assistant to propose actions based on your messages"
            toggle
            toggleValue={settings.assistantQuickSuggestions}
            onToggleChange={(value) => {
              updateSettings({ assistantQuickSuggestions: value });
              setInfoMessage(value ? 'AI suggestions enabled' : 'AI suggestions disabled');
            }}
            isLast
          />
        </GlassCard>

        <SectionLabel label="Finance" />
        <GlassCard>
          <SettingsRow
            icon="card-outline"
            label="Fuliza credit limit"
            value={settings.fulizaLimit ? formatCurrency(settings.fulizaLimit, { currency: settings.currency }) : 'Not set'}
            showChevron
            onPress={() => setFulizaVisible(true)}
            isLast
          />
        </GlassCard>

        <SectionLabel label="Import SMS" />
        <GlassCard>
          <SettingsRow
            icon="medkit-outline"
            label="Import Health"
            showChevron
            onPress={() => navigation.navigate('SmsImportHealth')}
          />
          <SettingsRow
            icon="list-outline"
            label="Review Queue"
            showChevron
            onPress={() => navigation.navigate('ReviewQueue')}
            isLast
          />
        </GlassCard>

        <SectionLabel label="About" />
        <GlassCard>
          <SettingsRow
            icon="gift-outline"
            label="What's new"
            showChevron
            onPress={() => navigation.navigate('Changelog')}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="About Version"
            value={`${APP_NAME} ${APP_VERSION}`}
            showChevron
            onPress={() => Alert.alert('About', `${APP_NAME} v${APP_VERSION}`)}
          />
          <SettingsRow
            icon="trash-outline"
            iconColor={colors.danger}
            label="Clear all local data"
            showChevron
            destructive
            onPress={handleClearData}
            isLast
          />
        </GlassCard>

        <SectionLabel label="App Updates" />
        <GlassCard>
          <View style={styles.updateActions}>
            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: colors.glassWhite, borderColor: colors.border },
              ]}
              onPress={handleCheckUpdates}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.updateButtonText, { color: colors.textPrimary }]}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: colors.accentPrimary },
              ]}
              onPress={handleDownloadUpdate}
            >
              <Ionicons name="download-outline" size={18} color={colors.textInverse} />
              <Text style={[styles.updateButtonText, { color: colors.textInverse }]}>Download</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>

      <FulizaLimitModal
        visible={fulizaVisible}
        currentLimit={settings.fulizaLimit}
        onCancel={() => setFulizaVisible(false)}
        onSave={(limit) => {
          updateSettings({ fulizaLimit: limit });
          setFulizaVisible(false);
          setInfoMessage(
            limit > 0 ? `Fuliza limit set to ${formatCurrency(limit, { currency: settings.currency })}` : 'Fuliza credit limit cleared'
          );
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
  updateActions: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  updateButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
