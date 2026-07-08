import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Vibration, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Button,
  IconButton,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useAppStore } from '../../store';
import { spacing, motion } from '../../theme';
import { promptBiometrics } from '../../utils/biometrics';

const KEYPAD_ROWS: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'backspace'],
];

export function AppLockScreen() {
  const theme = useTheme();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setIsAppLocked = useAppStore((state) => state.setIsAppLocked);

  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [checkingFingerprint, setCheckingFingerprint] = useState(settings.fingerprintEnabled);
  const attemptedFingerprint = useRef(false);

  const attemptFingerprint = async () => {
    setCheckingFingerprint(true);
    const result = await promptBiometrics('Unlock the app with your fingerprint');
    setCheckingFingerprint(false);
    if (result.ok) {
      setIsAppLocked(false);
    }
  };

  useEffect(() => {
    if (settings.fingerprintEnabled && !attemptedFingerprint.current) {
      attemptedFingerprint.current = true;
      attemptFingerprint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot your PIN?',
      'This turns off screen lock so you can get back into the app. You can set a new PIN afterward in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off screen lock',
          style: 'destructive',
          onPress: () => {
            updateSettings({ screenLockEnabled: false, pinCode: '', fingerprintEnabled: false });
            setIsAppLocked(false);
          },
        },
      ]
    );
  };

  const pinLength = settings.pinCode.length || 4;

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setEntered((prev) => prev.slice(0, -1));
      return;
    }
    if (entered.length >= (settings.pinCode.length || 8)) return;

    const next = entered + key;
    setEntered(next);
    setError(false);

    if (next.length === settings.pinCode.length) {
      if (next === settings.pinCode) {
        setIsAppLocked(false);
        setEntered('');
      } else {
        setError(true);
        Vibration.vibrate(motion.slow);
        setTimeout(() => setEntered(''), 300);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons
            name={checkingFingerprint ? 'finger-print' : 'lock-closed'}
            size={32}
            color={theme.colors.primary}
          />
        </View>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {checkingFingerprint ? 'Fingerprint required' : 'Enter your PIN'}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: error ? theme.colors.error : theme.colors.onSurfaceVariant,
            marginTop: spacing.sm,
          }}
        >
          {checkingFingerprint
            ? 'Confirm your fingerprint to continue'
            : error
            ? 'Incorrect PIN, try again'
            : 'Unlock to continue'}
        </Text>

        {settings.fingerprintEnabled && !checkingFingerprint && (
          <Button
            mode="text"
            icon={({ color }) => <Ionicons name="finger-print-outline" size={18} color={color} />}
            onPress={attemptFingerprint}
            textColor={theme.colors.primary}
            style={{ marginTop: spacing.lg }}
          >
            Try fingerprint again
          </Button>
        )}

        <View style={styles.dotsRow}>
          {Array.from({ length: pinLength }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: error ? theme.colors.error : theme.colors.outline,
                  backgroundColor:
                    index < entered.length
                      ? error
                        ? theme.colors.error
                        : theme.colors.primary
                      : 'transparent',
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key, keyIndex) => {
                if (key === null) return <View key={keyIndex} style={styles.key} />;
                if (key === 'backspace') {
                  return (
                    <IconButton
                      key={keyIndex}
                      icon={() => <Ionicons name="backspace-outline" size={24} color={theme.colors.onSurface} />}
                      style={styles.key}
                      size={24}
                      onPress={() => handleKeyPress('backspace')}
                    />
                  );
                }
                return (
                  <TouchableRipple
                    key={keyIndex}
                    style={[styles.key, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => handleKeyPress(key)}
                  >
                    <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                      {key}
                    </Text>
                  </TouchableRipple>
                );
              })}
            </View>
          ))}
        </View>

        <Button
          mode="text"
          onPress={handleForgotPin}
          textColor={theme.colors.onSurfaceVariant}
          style={{ marginTop: spacing.xl }}
        >
          Forgot PIN?
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing['2xl'],
    marginBottom: spacing['2xl'],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  keypad: {
    gap: spacing.base,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
