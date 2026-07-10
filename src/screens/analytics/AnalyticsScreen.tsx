import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
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
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { useAnalyticsStore, type DateRange } from '../../store/useAnalyticsStore';
import { useDataVersion } from '../../store/dataVersion';
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards';
import { SpendingComparisonCard } from '../../components/analytics/SpendingComparisonCard';
import { CategorySpendCards } from '../../components/analytics/CategorySpendCards';
import { FeesCard } from '../../components/analytics/FeesCard';
import { InsightsTab } from '../../components/analytics/InsightsTab';
import { animateLayout } from '../../utils/animation';
import { formatCurrency } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';


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
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [uncategorizedAmount, setUncategorizedAmount] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    loadAnalytics(db);
  }, [db, dateRange, loadAnalytics, dataVersion]);

  useEffect(() => {
    const repo = new TransactionRepository(db);
    repo.getUncategorized().then((rows) => {
      setUncategorizedCount(rows.length);
      setUncategorizedAmount(rows.reduce((sum, r) => sum + r.amount, 0));
    });
  }, [db, dataVersion]);

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

            {uncategorizedCount > 0 && !nudgeDismissed && (
              <Pressable
                onPress={() => navigation.navigate('Categorize')}
                style={[styles.uncatBanner, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                  {uncategorizedCount} transactions ({formatCurrency(uncategorizedAmount, { decimals: 0 })}) uncategorized — charts may be incomplete
                </Text>
                <Pressable onPress={(e) => { e.stopPropagation(); setNudgeDismissed(true); }} hitSlop={8}>
                  <Ionicons name="close" size={16} color={theme.colors.outline} />
                </Pressable>
              </Pressable>
            )}

            <SpendingComparisonCard
              currentMonthSpend={data.currentMonthSpend}
              prevMonthSpend={data.prevMonthSpend}
            />

            <AnalyticsSummaryCards
              spend={data.totalSpend}
              income={data.totalIncome}
              net={data.net}
              average={data.averageTransaction}
            />

            <CategorySpendCards items={data.categorySparklines} />

            <FeesCard {...data.feesData} />
          </>
        )}

        {tab === 'insights' && (
          <InsightsTab dataVersion={dataVersion} />
        )}

        {!data && !isLoading && tab === 'analytics' && (
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
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  rangeContainer: {
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  rangeChip: {
    borderWidth: 1,
  },
  emptyState: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
  },
  uncatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
