import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography } from '../../theme';

interface MetricCardProps {
  label: string;
  amount: number;
}

export function MetricCard({ label, amount }: MetricCardProps) {
  const colors = useThemeColors();

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.amount, { color: colors.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
      >
        {formatCurrency(amount, { decimals: 0 })}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    width: 'auto',
    padding: spacing.lg,
    paddingRight: spacing.xl,
    marginRight: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  amount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
});
