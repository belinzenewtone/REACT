import React, { useState } from 'react';
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
import { SegmentedControl } from '../../components/settings/SegmentedControl';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { spacing, typography, borderRadius } from '../../theme';

type LockTab = 'biometric' | 'pin';

const TAB_OPTIONS: { value: LockTab; label: string }[] = [
  { value: 'biometric', label: 'Biometric' },
  { value: 'pin', label: 'PIN' },
];

export function ScreenLockScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState<LockTab>('biometric');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSavePin = () => {
    if (settings.pinCode && currentPin !== settings.pinCode) {
      Alert.alert('Error', 'Current PIN is incorrect.');
      return;
    }
    if (newPin.length < 4 || confirmPin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PIN and confirm PIN do not match.');
      return;
    }
    updateSettings({ pinCode: newPin, screenLockEnabled: true });
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    Alert.alert('Success', 'PIN saved successfully.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Screen Lock</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard>
          <SegmentedControl
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={setActiveTab}
          />
        </GlassCard>

        {activeTab === 'biometric' ? (
          <GlassCard style={styles.card}>
            <SettingsRow
              icon="finger-print-outline"
              label="Fingerprint"
              toggle
              toggleValue={settings.fingerprintEnabled}
              onToggleChange={(value) => updateSettings({ fingerprintEnabled: value })}
            />
            <SettingsRow
              icon="scan-outline"
              label="Face unlock"
              toggle
              toggleValue={settings.faceUnlockEnabled}
              onToggleChange={(value) => updateSettings({ faceUnlockEnabled: value })}
              isLast
            />
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <SettingsRow
              label="PIN lock"
              toggle
              toggleValue={settings.screenLockEnabled}
              onToggleChange={(value) => {
                updateSettings({ screenLockEnabled: value });
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
                  style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]}
                  onPress={handleSavePin}
                >
                  <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                    Save PIN
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  card: {
    marginTop: spacing.lg,
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
