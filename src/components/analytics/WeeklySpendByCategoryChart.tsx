import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

interface CategorySpend {
  category: string;
  amount: number;
  color: string;
}

interface WeeklyCategorySpendItem {
  week: string;
  label: string;
  categories: CategorySpend[];
  total: number;
}

interface WeeklySpendByCategoryChartProps {
  data: WeeklyCategorySpendItem[];
}

export function WeeklySpendByCategoryChart({ data }: WeeklySpendByCategoryChartProps) {
  const colors = useThemeColors();

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  // Collect unique categories across all weeks for the legend, sorted by total amount
  const categoryTotals = new Map<string, { category: string; color: string; total: number }>();
  for (const week of data) {
    for (const cat of week.categories) {
      const existing = categoryTotals.get(cat.category) ?? { category: cat.category, color: cat.color, total: 0 };
      existing.total += cat.amount;
      categoryTotals.set(cat.category, existing);
    }
  }
  const legendItems = Array.from(categoryTotals.values()).sort((a, b) => b.total - a.total);

  return (
    <View>
      <SectionHeader title="Weekly Spend by Category" />
      <GlassCard>
        {data.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No expense data</Text>
        ) : (
          <>
            {legendItems.length > 0 && (
              <View style={styles.legend}>
                {legendItems.map((item) => (
                  <View key={item.category} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.chartContainer}>
              {data.map((week) => {
                const fraction = week.total > 0 ? week.total / maxTotal : 0;
                const barHeightPercent = Math.max(fraction * 100, 2);
                return (
                  <View key={week.week} style={styles.barColumn}>
                    {week.total > 0 ? (
                      <View style={[styles.barFill, { height: `${barHeightPercent}%` }]}>
                        {week.categories
                          .slice()
                          .reverse()
                          .map((cat, index) => {
                            const segmentHeight = (cat.amount / week.total) * 100;
                            return (
                              <View
                                key={`${week.week}-${cat.category}-${index}`}
                                style={[
                                  styles.barSegment,
                                  {
                                    height: `${segmentHeight}%`,
                                    backgroundColor: cat.color,
                                  },
                                ]}
                              />
                            );
                          })}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.barFill,
                          styles.barEmpty,
                          { height: `${barHeightPercent}%`, backgroundColor: colors.borderSubtle },
                        ]}
                      />
                    )}
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{week.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total spend</Text>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                {formatCurrency(data.reduce((sum, d) => sum + d.total, 0))}
              </Text>
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 220,
    paddingBottom: spacing.base,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    marginHorizontal: 4,
  },
  barFill: {
    width: '60%',
    justifyContent: 'flex-end',
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  barEmpty: {},
  barSegment: {
    width: '100%',
  },
  barLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  totalLabel: {
    fontSize: typography.sizes.sm,
  },
  totalValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
