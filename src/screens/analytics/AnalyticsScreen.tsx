import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAnalyticsStore, type DateRange } from '../../store/useAnalyticsStore';
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards';
import { CategoryBreakdownChart } from '../../components/analytics/CategoryBreakdownChart';
import { MonthlyTrendChart } from '../../components/analytics/MonthlyTrendChart';
import { BudgetVsActualChart } from '../../components/analytics/BudgetVsActualChart';
import { TopMerchants } from '../../components/analytics/TopMerchants';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: '3M', value: 'last_3_months' },
  { label: '6M', value: 'last_6_months' },
  { label: 'Year', value: 'this_year' },
];

type Insight = { icon: string; title: string; body: string; type: 'positive' | 'warning' | 'neutral' };

function InsightCard({ insight, colors }: { insight: Insight; colors: any }) {
  const iconColor = insight.type === 'positive' ? colors.success : insight.type === 'warning' ? colors.warning : colors.accentPrimary;
  return (
    <GlassCard style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightIconBox, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={insight.icon as any} size={18} color={iconColor} />
        </View>
        <Text style={[styles.insightTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {insight.title}
        </Text>
      </View>
      <Text style={[styles.insightBody, { color: colors.textSecondary }]}>{insight.body}</Text>
    </GlassCard>
  );
}

export function AnalyticsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { data, isLoading, dateRange, setDateRange, loadAnalytics } = useAnalyticsStore();

  useEffect(() => {
    loadAnalytics(db);
  }, [db, dateRange, loadAnalytics]);

  const insights = useMemo<Insight[]>(() => {
    if (!data) return [];
    const list: Insight[] = [];

    const savingsRate = data.totalIncome > 0 ? ((data.totalIncome - data.totalSpend) / data.totalIncome) * 100 : 0;
    if (savingsRate > 20) {
      list.push({ icon: 'trending-up', title: 'Strong savings rate', body: `You saved ${savingsRate.toFixed(0)}% of income this period. Keep it up.`, type: 'positive' });
    } else if (savingsRate < 0) {
      list.push({ icon: 'trending-down', title: 'Spending exceeds income', body: `Expenses are ${formatCurrency(Math.abs(data.net))} over your income for this period.`, type: 'warning' });
    }

    if (data.budgetVsActual?.length > 0) {
      const overBudget = data.budgetVsActual.filter((b: any) => b.actual > b.limit);
      if (overBudget.length > 0) {
        list.push({ icon: 'alert-circle-outline', title: `${overBudget.length} budget${overBudget.length > 1 ? 's' : ''} exceeded`, body: `${overBudget.map((b: any) => b.category).join(', ')} went over limit.`, type: 'warning' });
      } else {
        list.push({ icon: 'checkmark-circle-outline', title: 'All budgets on track', body: 'Every spending guardrail is within its limit for this period.', type: 'positive' });
      }
    }

    if (data.topMerchants?.length > 0) {
      const top = data.topMerchants[0];
      list.push({ icon: 'storefront-outline', title: `Top merchant: ${top.merchant}`, body: `${formatCurrency(top.total)} across ${top.count} transactions.`, type: 'neutral' });
    }

    if (data.averageTransaction > 0) {
      list.push({ icon: 'calculator-outline', title: 'Average transaction', body: `${formatCurrency(data.averageTransaction)} per transaction this period.`, type: 'neutral' });
    }

    return list.slice(0, 4);
  }, [data]);

  const productivityScore = useMemo(() => {
    if (!data) return null;
    const savingsComponent = data.totalIncome > 0 ? Math.min(((data.totalIncome - data.totalSpend) / data.totalIncome) * 50, 50) : 0;
    const budgetComponent = data.budgetVsActual?.length > 0
      ? (data.budgetVsActual.filter((b: any) => b.actual <= b.limit).length / data.budgetVsActual.length) * 50
      : 25;
    return Math.max(0, Math.round(savingsComponent + budgetComponent));
  }, [data]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>
        <TouchableOpacity
          style={[styles.weekReviewBtn, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
          onPress={() => navigation.navigate('WeekReview')}
        >
          <Ionicons name="compass-outline" size={16} color={colors.accentPrimary} />
          <Text style={[styles.weekReviewText, { color: colors.accentPrimary }]}>Week Review</Text>
        </TouchableOpacity>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Period picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeRow}
        >
          {DATE_RANGES.map((range) => {
            const active = dateRange === range.value;
            return (
              <TouchableOpacity
                key={range.value}
                style={[styles.rangeChip, {
                  backgroundColor: active ? colors.accentPrimary : colors.glassWhite,
                  borderColor: active ? colors.accentPrimary : colors.border,
                }]}
                onPress={() => setDateRange(range.value)}
              >
                <Text style={[styles.rangeText, { color: active ? colors.textInverse : colors.textPrimary }]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {data && (
          <>
            {/* Summary cards */}
            <AnalyticsSummaryCards
              spend={data.totalSpend}
              income={data.totalIncome}
              net={data.net}
              average={data.averageTransaction}
            />

            {/* Productivity score */}
            {productivityScore !== null && (
              <GlassCard style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreLeft}>
                    <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>FINANCIAL HEALTH SCORE</Text>
                    <Text style={[styles.scoreValue, { color: productivityScore >= 70 ? colors.success : productivityScore >= 40 ? colors.warning : colors.danger }]}>
                      {productivityScore}
                    </Text>
                    <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>
                      {productivityScore >= 70 ? 'Excellent' : productivityScore >= 40 ? 'Moderate' : 'Needs attention'}
                    </Text>
                  </View>
                  <View style={styles.scoreRingWrap}>
                    <View style={[styles.scoreRing, { borderColor: productivityScore >= 70 ? colors.success : productivityScore >= 40 ? colors.warning : colors.danger }]}>
                      <Text style={[styles.scoreRingValue, { color: productivityScore >= 70 ? colors.success : productivityScore >= 40 ? colors.warning : colors.danger }]}>
                        {productivityScore}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.scoreTrack, { backgroundColor: colors.bgTertiary }]}>
                  <View style={[styles.scoreFill, {
                    width: `${productivityScore}%`,
                    backgroundColor: productivityScore >= 70 ? colors.success : productivityScore >= 40 ? colors.warning : colors.danger,
                  }]} />
                </View>
              </GlassCard>
            )}

            {/* AI Insight cards */}
            {insights.length > 0 && (
              <View style={styles.insightsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Observations</Text>
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} colors={colors} />
                ))}
              </View>
            )}

            {/* Category breakdown */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Breakdown</Text>
              <CategoryBreakdownChart data={data.categoryBreakdown} />
            </View>

            {/* Monthly trend */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Spending Trend</Text>
              <MonthlyTrendChart data={data.monthlyTrend} />
            </View>

            {/* Budget vs actual */}
            {data.budgetVsActual?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budget vs Actual</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                    <Text style={[styles.sectionAction, { color: colors.accentPrimary }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <BudgetVsActualChart data={data.budgetVsActual} />
              </View>
            )}

            {/* Top merchants */}
            {data.topMerchants?.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Merchants</Text>
                <TopMerchants merchants={data.topMerchants} />
              </View>
            )}
          </>
        )}

        {!data && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No data yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Import or add transactions to see your financial insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
  },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  weekReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  weekReviewText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing['4xl'], gap: spacing.xl },
  rangeRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  rangeChip: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  rangeText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  // Score card
  scoreCard: {},
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.base },
  scoreLeft: { flex: 1, gap: 4 },
  scoreLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, letterSpacing: 0.8 },
  scoreValue: { fontSize: typography.sizes['4xl'], fontWeight: typography.weights.bold },
  scoreSub: { fontSize: typography.sizes.sm },
  scoreRingWrap: { justifyContent: 'center', alignItems: 'center' },
  scoreRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  scoreRingValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  scoreTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  // Sections
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionAction: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  section: { gap: spacing.sm },
  insightsSection: { gap: spacing.sm },
  // Insight cards
  insightCard: { marginBottom: 0 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  insightIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  insightTitle: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  insightBody: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.6 },
  // Empty state
  emptyState: { alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.sm },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold },
  emptyBody: { fontSize: typography.sizes.base, textAlign: 'center', lineHeight: 22 },
});
