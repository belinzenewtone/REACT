import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { SegmentedControl } from '../../components/settings/SegmentedControl';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, typography, borderRadius } from '../../theme';

type LockTab = 'fingerprint' | 'pin';

const TAB_OPTIONS: { value: LockTab; label: string }[] = [
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'pin', label: 'PIN' },
];

const TIMEOUT_OPTIONS = [
  { value: '0', label: 'Immediately' },
  { value: '1', label: 'After 1 minute' },
  { value: '5', label: 'After 5 minutes' },
  { value: '15', label: 'After 15 minutes' },
  { value: '30', label: 'After 30 minutes' },
  { value: '60', label: 'After 1 hour' },
];

export function ScreenLockScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState<LockTab>(settings.pinCode ? 'fingerprint' : 'pin');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleToggleFingerprint = (value: boolean) => {
    if (value && !settings.pinCode) {
      Alert.alert(
        'Set up a PIN first',
        'Fingerprint unlock needs a PIN as a fallback, in case fingerprint matching fails. Set up your PIN, then turn Fingerprint back on.',
        [{ text: 'Set up PIN', onPress: () => setActiveTab('pin') }]
      );
      return;
    }
    updateSettings({ fingerprintEnabled: value });
  };

  const handleSavePin = () => {
    if (settings.pinCode && currentPin !== settings.pinCode) {
      Alert.alert('Incorrect PIN', 'Your current PIN is incorrect.');
      return;
    }
    if (newPin.length < 4 || confirmPin.length < 4) {
      Alert.alert('PIN too short', 'PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("PINs don't match", 'New PIN and confirm PIN must match.');
      return;
    }
    const isFirstSetup = !settings.pinCode;
    updateSettings({ pinCode: newPin, screenLockEnabled: true });
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setMessage(isFirstSetup ? 'PIN set up successfully' : 'PIN changed successfully');
  };

  const canSavePin = newPin.length >= 4 && confirmPin.length >= 4 && (!settings.pinCode || currentPin.length >= 4);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={message ?? ''} visible={!!message} onDismiss={() => setMessage(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Screen Lock</Text>
          <View style={{ width: 24 }} />
        </View>

        <GlassCard>
          <SegmentedControl
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={setActiveTab}
          />
        </GlassCard>

        {activeTab === 'fingerprint' ? (
          <GlassCard style={styles.card}>
            <SettingsRow
              icon="finger-print-outline"
              label="Fingerprint"
              subtitle={settings.pinCode ? undefined : 'Requires a PIN as fallback'}
              toggle
              toggleValue={settings.fingerprintEnabled}
              onToggleChange={handleToggleFingerprint}
              isLast={!settings.fingerprintEnabled}
            />
            {settings.fingerprintEnabled && (
              <View style={styles.timeoutRow}>
                <Dropdown
                  label="Auto-lock"
                  value={String(settings.lockTimeoutMinutes)}
                  options={TIMEOUT_OPTIONS}
                  onChange={(value) => updateSettings({ lockTimeoutMinutes: Number(value) })}
                />
                <Text style={[styles.timeoutHint, { color: colors.textTertiary }]}>
                  How long the app can sit in the background before fingerprint (or your PIN) is
                  required again.
                </Text>
              </View>
            )}
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <SettingsRow
              label="PIN lock"
              toggle
              toggleValue={settings.screenLockEnabled}
              onToggleChange={(value) => {
                updateSettings({
                  screenLockEnabled: value,
                  ...(value ? {} : { fingerprintEnabled: false }),
                });
                if (!value) {
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                }
              }}
              isLast
            />

            {settings.screenLockEnabled && (
              <View style={styles.pinForm}>
                {settings.pinCode ? (
                  <PinInput
                    label="Current PIN"
                    value={currentPin}
                    onChangeText={setCurrentPin}
                  />
                ) : null}
                <PinInput label="New PIN" value={newPin} onChangeText={setNewPin} />
                <PinInput
                  label="Confirm PIN"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                />
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: canSavePin ? colors.accentPrimary : colors.textTertiary },
                  ]}
                  onPress={handleSavePin}
                  disabled={!canSavePin}
                >
                  <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                    {settings.pinCode ? 'Change PIN' : 'Save PIN'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PinInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.glassWhite,
            borderColor: colors.border,
          },
        ]}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 8))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        placeholder="••••"
        placeholderTextColor={colors.textTertiary}
      />
    </View>
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
  },
  card: {
    marginTop: spacing.lg,
  },
  timeoutRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  timeoutHint: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.5,
    marginTop: -spacing.sm,
  },
  pinForm: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    letterSpacing: 4,
  },
  saveButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
