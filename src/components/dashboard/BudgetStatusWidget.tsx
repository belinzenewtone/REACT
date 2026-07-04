import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { formatCurrency, formatPercent, clamp } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

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
  const topBudgets = budgets.slice(0, 3);

  return (
    <View>
      <SectionHeader title="Budgets" actionLabel="View all" onAction={onViewAll} />
      <GlassCard>
        {topBudgets.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
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
  const theme = useTheme();
  const percent = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
  const clampedPercent = clamp(percent, 0, 100);

  let barColor = theme.colors.primary;
  if (percent > 80) barColor = theme.colors.error;
  else if (percent > 50) barColor = theme.colors.tertiary;

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {budget.category}
        </Text>
        <Text variant="bodySmall" style={{ color: barColor }} numberOfLines={1}>
          {formatPercent(percent)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPercent}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.amounts}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatCurrency(budget.spent)} spent
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
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
  },
  budgetRow: {
    marginBottom: spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});
