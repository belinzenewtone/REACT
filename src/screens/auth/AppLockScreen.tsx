import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { spacing, typography, borderRadius, motion } from '../../theme';

const KEYPAD_ROWS: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'backspace'],
];

export function AppLockScreen() {
  const colors = useThemeColors();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setIsAppLocked = useAppStore((state) => state.setIsAppLocked);

  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

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
            updateSettings({ screenLockEnabled: false, pinCode: '' });
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.accentPrimary}20` }]}>
          <Ionicons name="lock-closed" size={32} color={colors.accentPrimary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Enter your PIN</Text>
        <Text style={[styles.subtitle, { color: error ? colors.danger : colors.textSecondary }]}>
          {error ? 'Incorrect PIN, try again' : 'Unlock to continue'}
        </Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: pinLength }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: error ? colors.danger : colors.border,
                  backgroundColor:
                    index < entered.length ? (error ? colors.danger : colors.accentPrimary) : 'transparent',
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
                    <TouchableOpacity
                      key={keyIndex}
                      style={styles.key}
                      onPress={() => handleKeyPress('backspace')}
                    >
                      <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={[styles.key, { backgroundColor: colors.glassWhite }]}
                    onPress={() => handleKeyPress(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleForgotPin} style={styles.forgotButton}>
          <Text style={[styles.forgotText, { color: colors.textSecondary }]}>Forgot PIN?</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
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
  keyText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
  },
  forgotButton: {
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  forgotText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
