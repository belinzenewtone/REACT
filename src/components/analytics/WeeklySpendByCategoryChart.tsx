import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

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
  const theme = useTheme();

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

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
          <Text variant="bodyLarge" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            No expense data
          </Text>
        ) : (
          <>
            {legendItems.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.legend}
              >
                {legendItems.map((item) => (
                  <View key={item.category} style={styles.legendItem}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                        {item.category}
                      </Text>
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16 }}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
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
                          { height: `${barHeightPercent}%`, backgroundColor: theme.colors.outlineVariant },
                        ]}
                      />
                    )}
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {week.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.totalRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Total spend
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
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
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  legendItem: {
    marginRight: spacing.base,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
});
