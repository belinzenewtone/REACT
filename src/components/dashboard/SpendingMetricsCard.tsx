import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { spacing, typography } from '../../theme';

interface SpendingMetricsCardProps {
  income: number;
  expense: number;
  lastMonthIncome: number;
  lastMonthExpense: number;
}

export function SpendingMetricsCard({
  income,
  expense,
  lastMonthIncome,
  lastMonthExpense,
}: SpendingMetricsCardProps) {
  const colors = useThemeColors();
  const net = income - expense;

  const incomeChange = lastMonthIncome > 0 ? ((income - lastMonthIncome) / lastMonthIncome) * 100 : 0;
  const expenseChange = lastMonthExpense > 0 ? ((expense - lastMonthExpense) / lastMonthExpense) * 100 : 0;

  return (
    <GlassCard>
      <View style={styles.row}>
        <MetricItem
          label="Income"
          amount={income}
          change={incomeChange}
          icon="arrow-down-circle"
          iconColor={colors.success}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MetricItem
          label="Expenses"
          amount={expense}
          change={expenseChange}
          icon="arrow-up-circle"
          iconColor={colors.danger}
        />
      </View>

      <View style={[styles.netRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net this month</Text>
        <Text style={[styles.netAmount, { color: net >= 0 ? colors.success : colors.danger }]} numberOfLines={1} ellipsizeMode="tail">
          {formatCurrency(net)}
        </Text>
      </View>
    </GlassCard>
  );
}

interface MetricItemProps {
  label: string;
  amount: number;
  change: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

function MetricItem({ label, amount, change, icon, iconColor }: MetricItemProps) {
  const colors = useThemeColors();
  const isPositiveChange = change >= 0;

  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={[styles.metricLabel, { color: colors.textSecondary, marginLeft: 6 }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.metricAmount, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
        {formatCurrency(amount)}
      </Text>
      <View style={styles.changeRow}>
        <Ionicons
          name={isPositiveChange ? 'trending-up' : 'trending-down'}
          size={12}
          color={isPositiveChange ? colors.success : colors.danger}
        />
        <Text
          style={[
            styles.changeText,
            { color: isPositiveChange ? colors.success : colors.danger },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatPercent(Math.abs(change))} vs last month
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: typography.sizes.sm,
  },
  metricAmount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: typography.sizes.xs,
    marginLeft: 4,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.lg,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  netLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  netAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
