import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency, formatPercent, clamp } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export interface BudgetProgressItem {
  id: string;
  category: string;
  spent: number;
  limit: number;
}

interface BudgetStatusWidgetProps {
  budgets: BudgetProgressItem[];
  onViewAll?: () => void;
}

export function BudgetStatusWidget({ budgets, onViewAll }: BudgetStatusWidgetProps) {
  const colors = useThemeColors();
  const topBudgets = budgets.slice(0, 3);

  return (
    <View>
      <SectionHeader title="Budgets" actionLabel="View all" onAction={onViewAll} />
      <GlassCard>
        {topBudgets.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            No budgets set up yet
          </Text>
        ) : (
          topBudgets.map((budget) => (
            <BudgetRow key={budget.id} budget={budget} />
          ))
        )}
      </GlassCard>
    </View>
  );
}

function BudgetRow({ budget }: { budget: BudgetProgressItem }) {
  const colors = useThemeColors();
  const percent = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
  const clampedPercent = clamp(percent, 0, 100);

  let barColor = colors.success;
  if (percent > 80) barColor = colors.danger;
  else if (percent > 50) barColor = colors.warning;

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <Text style={[styles.category, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
          {budget.category}
        </Text>
        <Text style={[styles.percent, { color: barColor }]} numberOfLines={1}>
          {formatPercent(percent)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPercent}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.spent, { color: colors.textSecondary }]}>
          {formatCurrency(budget.spent)} spent
        </Text>
        <Text style={[styles.limit, { color: colors.textTertiary }]}>
          {formatCurrency(budget.limit)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
  },
  budgetRow: {
    marginBottom: spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
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
