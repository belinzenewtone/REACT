import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAnalyticsStore, type DateRange } from '../../store/useAnalyticsStore';
import { useDataVersion } from '../../store/dataVersion';
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards';
import { WeeklySpendByCategoryChart } from '../../components/analytics/WeeklySpendByCategoryChart';
import { TopMerchants } from '../../components/analytics/TopMerchants';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { spacing, typography, borderRadius } from '../../theme';

type Tab = 'analytics' | 'insights';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { key: 'insights', label: 'Insights', icon: 'bulb-outline' },
];

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'This week', value: 'this_week' },
  { label: 'This month', value: 'this_month' },
];

export function AnalyticsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [tab, setTab] = useState<Tab>('analytics');
  const { data, isLoading, dateRange, setDateRange, loadAnalytics } = useAnalyticsStore();
  const dataVersion = useDataVersion((s) => s.version);

  useEffect(() => {
    loadAnalytics(db);
  }, [db, dateRange, loadAnalytics, dataVersion]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Analytics</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              Productivity and finance trends in one place
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && { backgroundColor: colors.accentPrimary }]}
                onPress={() => {
                  animateLayout();
                  setTab(t.key);
                }}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[styles.tabLabel, { color: active ? colors.textInverse : colors.textSecondary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {data && tab === 'analytics' && (
          <>
            {/* Date range chips — only on Analytics tab */}
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

            <AnalyticsSummaryCards
              spend={data.totalSpend}
              income={data.totalIncome}
              net={data.net}
              average={data.averageTransaction}
            />

            <View style={styles.section}>
              <WeeklySpendByCategoryChart data={data.weeklyCategorySpend} />
            </View>

            <View style={styles.section}>
              <TopMerchants merchants={data.topMerchants} />
            </View>
          </>
        )}

        {data && tab === 'insights' && (
          <>
            {/* Productivity Card */}
            <GlassCard style={styles.productivityCard}>
              <View style={styles.productivityHeader}>
                <Ionicons name="checkbox-outline" size={18} color={colors.success} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Productivity</Text>
              </View>
              <View style={styles.productivityStats}>
                <View style={styles.productivityStat}>
                  <Text style={[styles.productivityValue, { color: colors.success }]}>
                    {data.productivity.tasksCompleted}
                  </Text>
                  <Text style={[styles.productivityLabel, { color: colors.textSecondary }]}>Tasks completed</Text>
                </View>
                <View style={[styles.productivityDivider, { backgroundColor: colors.border }]} />
                <View style={styles.productivityStat}>
                  <Text style={[styles.productivityValue, { color: colors.warning }]}>
                    {data.productivity.tasksPending}
                  </Text>
                  <Text style={[styles.productivityLabel, { color: colors.textSecondary }]}>Tasks pending</Text>
                </View>
                <View style={[styles.productivityDivider, { backgroundColor: colors.border }]} />
                <View style={styles.productivityStat}>
                  <Text style={[styles.productivityValue, { color: colors.accentPrimary }]}>
                    {data.productivity.completionRate.toFixed(0)}%
                  </Text>
                  <Text style={[styles.productivityLabel, { color: colors.textSecondary }]}>Rate</Text>
                </View>
              </View>
            </GlassCard>

            {/* Insights Cards */}
            {data.insights.length > 0 && (
              <View style={styles.insightsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Insights</Text>
                <View style={styles.insightsGrid}>
                  {data.insights.map((insight, i) => (
                    <GlassCard key={i} style={styles.insightCard}>
                      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}20` }]}>
                        <Ionicons name={insight.icon as any} size={18} color={insight.color} />
                      </View>
                      <Text style={[styles.insightTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {insight.title}
                      </Text>
                      <Text style={[styles.insightDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {insight.description}
                      </Text>
                    </GlassCard>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {!data && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No data available</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
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
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  productivityCard: {
    marginTop: spacing.base,
  },
  productivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  productivityStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productivityStat: {
    flex: 1,
    alignItems: 'center',
  },
  productivityValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  productivityLabel: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  productivityDivider: {
    width: 1,
    height: 36,
  },
  insightsSection: {
    marginTop: spacing.xl,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  insightCard: {
    flex: 1,
    minWidth: '45%',
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    lineHeight: 18,
  },
  insightDesc: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  emptyState: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
  },
});
