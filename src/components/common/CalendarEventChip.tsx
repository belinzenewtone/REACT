import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface CalendarEventChipProps {
  label: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function CalendarEventChip({ label, color, icon, onPress }: CalendarEventChipProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}
    >
      {icon ? <Ionicons name={icon} size={12} color={color} style={styles.icon} /> : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
});
