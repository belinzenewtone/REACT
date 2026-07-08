import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { spacing } from '../../theme';

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
  const theme = useTheme();
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
          iconColor={theme.colors.primary}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
        <MetricItem
          label="Expenses"
          amount={expense}
          change={expenseChange}
          icon="arrow-up-circle"
          iconColor={theme.colors.error}
        />
      </View>

      <View style={[styles.netRow, { borderTopColor: theme.colors.outlineVariant }]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Net this month
        </Text>
        <Text
          variant="titleLarge"
          style={{ color: net >= 0 ? theme.colors.primary : theme.colors.error }}
          numberOfLines={1}
        >
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
  const theme = useTheme();
  const isPositiveChange = change >= 0;

  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
          {label}
        </Text>
      </View>
      <Text
        variant="headlineSmall"
        style={{ color: theme.colors.onSurface, marginTop: spacing.sm }}
        numberOfLines={1}
      >
        {formatCurrency(amount)}
      </Text>
      <View style={styles.changeRow}>
        <Ionicons
          name={isPositiveChange ? 'trending-up' : 'trending-down'}
          size={12}
          color={isPositiveChange ? theme.colors.primary : theme.colors.error}
        />
        <Text
          variant="bodySmall"
          style={{
            color: isPositiveChange ? theme.colors.primary : theme.colors.error,
            marginLeft: 4,
          }}
          numberOfLines={1}
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
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
});
