import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { spacing, typography, borderRadius } from '../../theme';

export function OnboardingScreen() {
  const colors = useThemeColors();
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to BELTECH</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your personal finance & life OS.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accentPrimary }]}
          onPress={() => setHasCompletedOnboarding(true)}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Get Started
          </Text>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.xl,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
