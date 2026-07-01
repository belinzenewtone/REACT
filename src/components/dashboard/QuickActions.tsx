import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface QuickActionsProps {
  onAddTransaction?: () => void;
  onAddTask?: () => void;
  onViewFinance?: () => void;
}

export function QuickActions({ onAddTransaction, onAddTask, onViewFinance }: QuickActionsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.accentPrimary }]}
        onPress={onAddTransaction}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={20} color={colors.textInverse} />
        <Text style={[styles.primaryText, { color: colors.textInverse }]} numberOfLines={1} ellipsizeMode="tail">
          Add Transaction
        </Text>
      </TouchableOpacity>

      <View style={styles.secondaryRow}>
        <SecondaryButton
          icon="checkbox-outline"
          label="Add Task"
          onPress={onAddTask}
        />
        <SecondaryButton
          icon="wallet-outline"
          label="View Finance"
          onPress={onViewFinance}
        />
      </View>
    </View>
  );
}

function SecondaryButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.secondaryButton, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={colors.accentPrimary} />
      <Text style={[styles.secondaryText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.base,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  primaryText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  secondaryText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
});
