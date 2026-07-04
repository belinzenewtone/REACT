import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { SegmentedControl } from '../../components/settings/SegmentedControl';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing } from '../../theme';
import { promptBiometrics } from '../../utils/biometrics';

const PIN_LENGTH = 6;
const SCROLL_INTO_VIEW_PADDING = 24;

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

function biometricFailureMessage(reason: 'no-hardware' | 'not-enrolled' | 'failed' | 'cancelled') {
  switch (reason) {
    case 'no-hardware':
      return 'This device has no fingerprint sensor.';
    case 'not-enrolled':
      return 'No fingerprint is enrolled on this device. Add one in your device settings first.';
    case 'cancelled':
      return 'Fingerprint check cancelled.';
    default:
      return "We couldn't verify your fingerprint. Please try again.";
  }
}

export function ScreenLockScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState<LockTab>(settings.pinCode ? 'fingerprint' : 'pin');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [verifyingFingerprint, setVerifyingFingerprint] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const focusedInput = useRef<View>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const input = focusedInput.current;
      const scroller = scrollRef.current;
      if (!input || !scroller) return;
      input.measureInWindow((_x: number, y: number, _width: number, height: number) => {
        const keyboardTop = Dimensions.get('window').height - event.endCoordinates.height;
        const overlap = y + height + SCROLL_INTO_VIEW_PADDING - keyboardTop;
        if (overlap > 0) {
          scroller.scrollTo({ y: scrollOffset.current + overlap, animated: true });
        }
      });
    });
    return () => subscription.remove();
  }, []);

  const handleToggleFingerprint = async (value: boolean) => {
    if (!value) {
      updateSettings({ fingerprintEnabled: false });
      return;
    }

    if (!settings.screenLockEnabled || !settings.pinCode) {
      Alert.alert(
        'Set up a PIN first',
        'Fingerprint unlock needs a PIN as a fallback, in case fingerprint matching fails. Set up your PIN, then turn Fingerprint back on.',
        [{ text: 'Set up PIN', onPress: () => setActiveTab('pin') }]
      );
      return;
    }

    setVerifyingFingerprint(true);
    const result = await promptBiometrics('Confirm your fingerprint to enable Fingerprint unlock');
    setVerifyingFingerprint(false);

    if (result.ok) {
      updateSettings({ fingerprintEnabled: true });
      setMessage('Fingerprint unlock enabled');
    } else {
      Alert.alert('Fingerprint not confirmed', biometricFailureMessage(result.reason));
    }
  };

  const handleSavePin = () => {
    if (settings.pinCode && currentPin !== settings.pinCode) {
      Alert.alert('Incorrect PIN', 'Your current PIN is incorrect.');
      return;
    }
    if (newPin.length !== PIN_LENGTH || confirmPin.length !== PIN_LENGTH) {
      Alert.alert('PIN incomplete', `PIN must be exactly ${PIN_LENGTH} digits.`);
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
    Keyboard.dismiss();
    setMessage(isFirstSetup ? 'PIN set up successfully' : 'PIN changed successfully');
  };

  const canSavePin =
    newPin.length === PIN_LENGTH &&
    confirmPin.length === PIN_LENGTH &&
    (!settings.pinCode || currentPin.length === PIN_LENGTH);

  const handlePinInputFocus = (ref: View | null) => {
    focusedInput.current = ref;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={message ?? ''} visible={!!message} onDismiss={() => setMessage(null)} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Screen Lock</Text>
          <View style={{ width: 44 }} />
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
              subtitle={
                verifyingFingerprint
                  ? 'Confirm your fingerprint…'
                  : settings.screenLockEnabled && settings.pinCode
                  ? undefined
                  : 'Requires a PIN as fallback'
              }
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
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: -spacing.sm }}>
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
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.xs }}>
                  {settings.pinCode ? 'Reset your secure access code' : 'Set up your secure access code'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
                  Use exactly {PIN_LENGTH} digits. Your new PIN is stored only on this device.
                </Text>

                {settings.pinCode ? (
                  <PinInput
                    label="Current PIN"
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    onFocusInput={handlePinInputFocus}
                  />
                ) : null}
                <PinInput
                  label="New PIN"
                  value={newPin}
                  onChangeText={setNewPin}
                  onFocusInput={handlePinInputFocus}
                />
                <PinInput
                  label="Confirm new PIN"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  onFocusInput={handlePinInputFocus}
                />
                <Button
                  mode="contained"
                  onPress={handleSavePin}
                  disabled={!canSavePin}
                  style={{ marginTop: spacing.base }}
                >
                  {settings.pinCode ? 'Update PIN' : 'Set PIN'}
                </Button>
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
  onFocusInput,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocusInput: (ref: View | null) => void;
}) {
  const theme = useTheme();
  const wrapperRef = useRef<View>(null);

  const handleFocus = () => {
    onFocusInput(wrapperRef.current);
  };

  return (
    <View ref={wrapperRef} style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          {value.length}/{PIN_LENGTH}
        </Text>
      </View>
      <TextInput
        mode="outlined"
        dense
        style={{ backgroundColor: theme.colors.surfaceVariant }}
        textColor={theme.colors.onSurface}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH))}
        onFocus={handleFocus}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_LENGTH}
        placeholder="0 0 0 0 0 0"
        placeholderTextColor={theme.colors.outline}
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'] * 2,
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
  pinForm: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
