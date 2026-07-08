import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as Updates from 'expo-updates';
import {
  enableBackgroundReceiver,
  setFulizaLimit,
  checkPermissions,
  requestSmsPermissions,
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
} from '../../../modules/lifeos-sms';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SegmentedControl } from '../../components/settings/SegmentedControl';
import { FulizaLimitModal } from '../../components/settings/FulizaLimitModal';
import { APP_NAME, APP_VERSION } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import type { ThemeMode } from '../../theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
];

const WARNING = '#F5CB5C';

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const setIsAuthenticated = useAppStore((state) => state.setIsAuthenticated);

  const [fulizaVisible, setFulizaVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [smsPermissionsGranted, setSmsPermissionsGranted] = useState(true);
  const [requestingPerms, setRequestingPerms] = useState(false);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = setTimeout(() => setInfoMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [infoMessage]);

  const refreshPermissionState = useCallback(async () => {
    try {
      const { receive, read } = await checkPermissions();
      setSmsPermissionsGranted(receive && read);
    } catch {
      setSmsPermissionsGranted(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissionState();
  }, [refreshPermissionState]);

  useFocusEffect(
    useCallback(() => {
      refreshPermissionState();
    }, [refreshPermissionState])
  );

  const handleGrantSmsPermissions = async () => {
    setRequestingPerms(true);
    try {
      const { granted } = await requestSmsPermissions();
      await refreshPermissionState();
      setInfoMessage(granted ? 'SMS permissions granted' : 'Permissions denied — grant them in device Settings');
    } catch {
      setInfoMessage('Could not request permissions');
    } finally {
      setRequestingPerms(false);
    }
  };

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

  const handleCheckUpdates = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'App Updates',
        `You're running ${APP_VERSION} in a development build — update checks only work in a published EAS build.`
      );
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      setUpdateAvailable(result.isAvailable);
      Alert.alert(
        'App Updates',
        result.isAvailable
          ? 'A new update is available to download.'
          : `You are on the latest version (${APP_VERSION}).`
      );
    } catch (error) {
      Alert.alert('Could not check for updates', 'Please try again later.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert('App Updates', 'Updates only work in a published EAS build, not in this development environment.');
      return;
    }
    if (!updateAvailable) {
      Alert.alert('Download Update', 'No update available yet. Check for updates first.');
      return;
    }
    setDownloadingUpdate(true);
    try {
      await Updates.fetchUpdateAsync();
      Alert.alert('Update downloaded', 'Restart the app to apply the update.', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart now', onPress: () => Updates.reloadAsync() },
      ]);
    } catch (error) {
      Alert.alert('Download failed', 'Could not download the update. Please try again.');
    } finally {
      setDownloadingUpdate(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={infoMessage ?? ''} visible={!!infoMessage} onDismiss={() => setInfoMessage(null)} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} onPress={() => navigation.goBack()} />
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Settings
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <SectionLabel label="Appearance" />
        <GlassCard>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(themeValue) => {
              updateSettings({ theme: themeValue });
              setInfoMessage(`Theme set to ${THEME_OPTIONS.find((o) => o.value === themeValue)?.label}`);
            }}
          />
        </GlassCard>

        <SectionLabel label="Calendar" />
        <GlassCard>
          <SettingsRow
            icon="swap-horizontal-outline"
            label="Swipe to change month"
            subtitle="Swipe left/right on the calendar grid to move between months."
            toggle
            toggleValue={settings.calendarSwipe !== false}
            onToggleChange={(value) => {
              updateSettings({ calendarSwipe: value });
              setInfoMessage(value ? 'Calendar swipe on' : 'Calendar swipe off');
            }}
            isLast
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
              if (value) {
                setTimeout(() => {
                  import('../../services/haptics').then((m) => m.haptic('success'));
                }, 30);
              }
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
        {!smsPermissionsGranted && (
          <Card
            mode="outlined"
            style={[styles.permBanner, { borderColor: WARNING, backgroundColor: `${WARNING}20` }]}
            onPress={handleGrantSmsPermissions}
          >
            <Card.Content style={styles.permBannerContent}>
              <Ionicons name="alert-circle-outline" size={18} color={WARNING} />
              <Text
                variant="bodyMedium"
                style={[styles.permBannerText, { color: WARNING }]}
                numberOfLines={2}
              >
                {requestingPerms ? 'Requesting…' : 'SMS permissions not granted — tap to allow'}
              </Text>
              {!requestingPerms && <Ionicons name="chevron-forward" size={16} color={WARNING} />}
            </Card.Content>
          </Card>
        )}
        <GlassCard>
          <SettingsRow
            icon="radio-outline"
            label="Background receiver"
            subtitle="Automatically capture & analyse M-Pesa messages even when the app is closed."
            toggle
            toggleValue={settings.smsBackgroundReceiver}
            onToggleChange={(value) => {
              enableBackgroundReceiver(value)
                .then(async () => {
                  updateSettings({ smsBackgroundReceiver: value });
                  if (value) {
                    try {
                      const exempt = await isIgnoringBatteryOptimizations();
                      if (!exempt) {
                        setInfoMessage('Allow "unrestricted battery" so SMS capture works when the app is closed');
                        await requestIgnoreBatteryOptimizations();
                      } else {
                        setInfoMessage('Background receiver on');
                      }
                    } catch {
                      setInfoMessage('Background receiver on');
                    }
                  } else {
                    setInfoMessage('Background receiver off');
                  }
                })
                .catch(() => {
                  setInfoMessage('Could not update background receiver — rebuild the app (expo run:android)');
                });
            }}
          />
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
            iconColor={theme.colors.error}
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
            <Button
              mode="outlined"
              onPress={handleCheckUpdates}
              disabled={checkingUpdate}
              loading={checkingUpdate}
              icon={() => <Ionicons name="refresh-outline" size={18} color={theme.colors.onSurface} />}
              style={[styles.updateButton, { borderColor: theme.colors.outlineVariant }]}
              textColor={theme.colors.onSurface}
            >
              Check
            </Button>
            <Button
              mode="contained"
              onPress={handleDownloadUpdate}
              disabled={downloadingUpdate}
              loading={downloadingUpdate}
              icon={() => <Ionicons name="download-outline" size={18} color={theme.colors.onPrimary} />}
              style={styles.updateButton}
            >
              Download
            </Button>
          </View>
        </GlassCard>
      </ScrollView>

      <FulizaLimitModal
        visible={fulizaVisible}
        currentLimit={settings.fulizaLimit}
        onCancel={() => setFulizaVisible(false)}
        onSave={(limit) => {
          setFulizaLimit(limit)
            .catch(() => setInfoMessage('Saved — will sync to background worker on next launch'))
            .finally(() => updateSettings({ fulizaLimit: limit }));
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
  const theme = useTheme();
  return (
    <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
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
    paddingVertical: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  permBanner: {
    marginBottom: spacing.sm,
    borderRadius: 16,
  },
  permBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permBannerText: {
    flex: 1,
  },
  updateActions: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  updateButton: {
    flex: 1,
  },
});
