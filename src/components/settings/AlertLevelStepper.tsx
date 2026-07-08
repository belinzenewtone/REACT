import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';

interface AlertLevelStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function AlertLevelStepper({ label, value, onChange, suffix = '%' }: AlertLevelStepperProps) {
  const theme = useTheme();

  const decrement = () => {
    if (value > 5) onChange(value - 5);
  };

  const increment = () => {
    if (value < 100) onChange(value + 5);
  };

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{label}</Text>
      <View style={[styles.control, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
        <IconButton
          icon={() => <Ionicons name="remove" size={18} color={theme.colors.onSurface} />}
          size={32}
          onPress={decrement}
          disabled={value <= 5}
          style={{ margin: 0 }}
        />
        <Text variant="titleMedium" style={[styles.value, { color: theme.colors.onSurface }]}>
          {value}{suffix}
        </Text>
        <IconButton
          icon={() => <Ionicons name="add" size={18} color={theme.colors.onSurface} />}
          size={32}
          onPress={increment}
          disabled={value >= 100}
          style={{ margin: 0 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xs,
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
  },
});
