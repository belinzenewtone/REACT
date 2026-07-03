import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency, formatPercent, clamp } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

interface BudgetProgressIndicatorProps {
  label: string;
  spent: number;
  limit: number;
  showAmounts?: boolean;
}

export function BudgetProgressIndicator({ label, spent, limit, showAmounts = true }: BudgetProgressIndicatorProps) {
  const colors = useThemeColors();
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const clampedPercent = clamp(percent, 0, 100);

  let barColor = colors.success;
  if (percent > 100) barColor = colors.danger;
  else if (percent > 80) barColor = colors.warning;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.percent, { color: barColor }]} numberOfLines={1}>
          {formatPercent(percent)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${clampedPercent}%`, backgroundColor: barColor }]} />
      </View>
      {showAmounts ? (
        <View style={styles.amounts}>
          <Text style={[styles.spent, { color: colors.textSecondary }]}>{formatCurrency(spent)} spent</Text>
          <Text style={[styles.limit, { color: colors.textTertiary }]}>{formatCurrency(limit)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  percent: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  spent: {
    fontSize: typography.sizes.xs,
  },
  limit: {
    fontSize: typography.sizes.xs,
  },
});
