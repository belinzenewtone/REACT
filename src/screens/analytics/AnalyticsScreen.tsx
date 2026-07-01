import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAnalyticsStore, type DateRange } from '../../store/useAnalyticsStore';
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards';
import { CategoryBreakdownChart } from '../../components/analytics/CategoryBreakdownChart';
import { MonthlyTrendChart } from '../../components/analytics/MonthlyTrendChart';
import { BudgetVsActualChart } from '../../components/analytics/BudgetVsActualChart';
import { TopMerchants } from '../../components/analytics/TopMerchants';
import { spacing, typography, borderRadius } from '../../theme';

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: '3M', value: 'last_3_months' },
  { label: '6M', value: 'last_6_months' },
  { label: 'Year', value: 'this_year' },
];

export function AnalyticsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { data, isLoading, dateRange, setDateRange, loadAnalytics } = useAnalyticsStore();

  useEffect(() => {
    loadAnalytics(db);
  }, [db, dateRange, loadAnalytics]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadAnalytics(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeContainer}
        >
          {DATE_RANGES.map((range) => {
            const isSelected = dateRange === range.value;
            return (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: isSelected ? colors.accentPrimary : colors.glassWhite,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setDateRange(range.value)}
              >
                <Text
                  style={[
                    styles.rangeText,
                    { color: isSelected ? colors.textInverse : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {data && (
          <>
            <AnalyticsSummaryCards
              spend={data.totalSpend}
              income={data.totalIncome}
              net={data.net}
              average={data.averageTransaction}
            />

            <View style={styles.section}>
              <CategoryBreakdownChart data={data.categoryBreakdown} />
            </View>

            <View style={styles.section}>
              <MonthlyTrendChart data={data.monthlyTrend} />
            </View>

            <View style={styles.section}>
              <BudgetVsActualChart data={data.budgetVsActual} />
            </View>

            <View style={styles.section}>
              <TopMerchants merchants={data.topMerchants} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  rangeContainer: {
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  rangeChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  rangeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  section: {
    marginTop: spacing.xl,
  },
});
