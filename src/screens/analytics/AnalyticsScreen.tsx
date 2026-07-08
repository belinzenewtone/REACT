import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Card,
  Text,
  Chip,
  SegmentedButtons,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useAnalyticsStore, type DateRange } from '../../store/useAnalyticsStore';
import { useDataVersion } from '../../store/dataVersion';
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards';
import { WeeklySpendByCategoryChart } from '../../components/analytics/WeeklySpendByCategoryChart';
import { TopMerchants } from '../../components/analytics/TopMerchants';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

const SUCCESS = '#7BC47B';
const WARNING = '#F5CB5C';

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
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [tab, setTab] = useState<Tab>('analytics');
  const { data, isLoading, dateRange, setDateRange, loadAnalytics } = useAnalyticsStore();
  const dataVersion = useDataVersion((s) => s.version);

  useEffect(() => {
    loadAnalytics(db);
  }, [db, dateRange, loadAnalytics, dataVersion]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadAnalytics(db)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Analytics
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              Productivity and finance trends in one place
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <SegmentedButtons
          value={tab}
          onValueChange={(value) => {
            animateLayout();
            setTab(value as Tab);
          }}
          buttons={TABS.map((t) => ({
            value: t.key,
            label: t.label,
            icon: () => <Ionicons name={t.icon} size={15} color={tab === t.key ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />,
          }))}
          style={[styles.tabBar, { backgroundColor: theme.colors.surfaceVariant }]}
        />

        {data && tab === 'analytics' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rangeContainer}
            >
              {DATE_RANGES.map((range) => {
                const isSelected = dateRange === range.value;
                return (
                  <Chip
                    key={range.value}
                    selected={isSelected}
                    onPress={() => setDateRange(range.value)}
                    style={[
                      styles.rangeChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                    textStyle={{ color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface }}
                  >
                    {range.label}
                  </Chip>
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
            <GlassCard style={styles.productivityCard}>
              <View style={styles.productivityHeader}>
                <Ionicons name="checkbox-outline" size={18} color={SUCCESS} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Productivity
                </Text>
              </View>
              <View style={styles.productivityStats}>
                <View style={styles.productivityStat}>
                  <Text variant="headlineSmall" style={{ color: SUCCESS }}>
                    {data.productivity.tasksCompleted}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Tasks completed
                  </Text>
                </View>
                <View style={[styles.productivityDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.productivityStat}>
                  <Text variant="headlineSmall" style={{ color: WARNING }}>
                    {data.productivity.tasksPending}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Tasks pending
                  </Text>
                </View>
                <View style={[styles.productivityDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.productivityStat}>
                  <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                    {data.productivity.completionRate.toFixed(0)}%
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Rate
                  </Text>
                </View>
              </View>
            </GlassCard>

            {data.insights.length > 0 && (
              <View style={styles.insightsSection}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
                  Key Insights
                </Text>
                <View style={styles.insightsGrid}>
                  {data.insights.map((insight, i) => (
                    <GlassCard key={i} style={styles.insightCard}>
                      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}20` }]}>
                        <Ionicons name={insight.icon as any} size={18} color={insight.color} />
                      </View>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
                        {insight.title}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
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
            <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>
              No data available
            </Text>
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  tabBar: {
    borderRadius: 16,
    marginBottom: spacing.base,
  },
  rangeContainer: {
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  rangeChip: {
    borderWidth: 1,
  },
  section: {
    marginTop: spacing.xl,
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
  emptyState: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
  },
});
