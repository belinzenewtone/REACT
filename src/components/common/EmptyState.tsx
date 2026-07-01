import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.accentPrimary}14` }]}>
        <Ionicons name={icon} size={32} color={colors.accentPrimary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.accentPrimary }]}
          onPress={onAction}
        >
          <Text style={[styles.actionText, { color: colors.accentPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: spacing.base,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
