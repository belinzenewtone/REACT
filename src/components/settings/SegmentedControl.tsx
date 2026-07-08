import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons, useTheme } from 'react-native-paper';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <SegmentedButtons
      value={value}
      onValueChange={(v) => onChange(v as T)}
      buttons={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
  },
});
