import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography } from '../../theme';

interface CategoryItem {
  category: string;
  amount: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  data: CategoryItem[];
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const colors = useThemeColors();

  const chartData = data.map((item) => ({
    value: item.amount,
    color: item.color,
    text: item.category,
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View>
      <SectionHeader title="Spending by category" />
      <GlassCard>
        {data.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No expense data</Text>
        ) : (
          <>
            <View style={styles.chartContainer}>
              <PieChart
                data={chartData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor={colors.bgSecondary}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={[styles.centerValue, { color: colors.textPrimary }]}>
                      {formatCurrency(total)}
                    </Text>
                    <Text style={[styles.centerLabelText, { color: colors.textSecondary }]}>Total</Text>
                  </View>
                )}
              />
            </View>

            <View style={styles.legend}>
              {data.slice(0, 6).map((item) => (
                <View key={item.category} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.category}
                  </Text>
                  <Text style={[styles.legendAmount, { color: colors.textSecondary }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
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
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  centerLabelText: {
    fontSize: typography.sizes.xs,
  },
  legend: {
    marginTop: spacing.base,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    textTransform: 'capitalize',
    marginRight: spacing.sm,
  },
  legendAmount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
