import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography } from '../../theme';

interface MonthlyItem {
  month: string;
  expense: number;
  income: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyItem[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const colors = useThemeColors();

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.expense, d.income)),
    1
  );

  const chartData = data.map((item) => ({
    value: item.expense,
    label: item.month,
    frontColor: colors.danger,
    spacing: 4,
    labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
  }));

  return (
    <View>
      <SectionHeader title="Monthly trend" />
      <GlassCard>
        {data.length === 0 || maxValue === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No data</Text>
        ) : (
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={280}
              height={180}
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
