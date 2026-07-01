import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography } from '../../theme';

interface BudgetVsActualItem {
  category: string;
  budgeted: number;
  actual: number;
}

interface BudgetVsActualChartProps {
  data: BudgetVsActualItem[];
}

export function BudgetVsActualChart({ data }: BudgetVsActualChartProps) {
  const colors = useThemeColors();

  const maxValue = Math.max(...data.map((d) => Math.max(d.budgeted, d.actual)), 1);

  const chartData = data.map((item) => ({
    value: item.actual,
    label: item.category.slice(0, 4),
    frontColor: item.actual > item.budgeted ? colors.danger : colors.accentPrimary,
    spacing: 4,
    labelTextStyle: { color: colors.textSecondary, fontSize: 10, textTransform: 'capitalize' as const },
  }));

  return (
    <View>
      <SectionHeader title="Budget vs actual" />
      <GlassCard>
        {data.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No budgets set up</Text>
        ) : (
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={280}
              height={160}
              maxValue={maxValue}
              noOfSections={4}
              barWidth={16}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              hideRules
            />
          </View>
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: spacing.base,
  },
});
