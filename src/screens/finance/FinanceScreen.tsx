import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDate,
  getDaysInMonth,
} from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTransactionStore, useDashboardStore, useBudgetStore, usePlannerStore, useAppStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { SearchFilterBar } from '../../components/finance/SearchFilterBar';
import { CategoryChips } from '../../components/finance/CategoryChips';
import { TransactionListItem } from '../../components/finance/TransactionListItem';
import { GlassCard } from '../../components/common/GlassCard';
import { CATEGORY_COLORS } from '../../constants';
import { formatCurrency, formatDate, formatRelativeDay } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import type { TransactionListItemData } from '../../components/finance/TransactionListItem';
import type { TransactionPeriod } from '../../store/useTransactionStore';

const CATEGORIES = Object.keys(CATEGORY_COLORS).filter(
  (c) => c !== 'income' && c !== 'uncategorized'
);

const PERIODS: { key: TransactionPeriod; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

interface ActionChip {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface DateGroup {
  title: string;
  data: TransactionListItemData[];
}

export function FinanceScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const repo = React.useMemo(() => new TransactionRepository(db), [db]);

  const {
    transactions,
    isLoading,
    hasMore,
    filters,
    setFilters,
    loadTransactions,
  } = useTransactionStore();

  const { todaySpend, weekSpend, loadDashboard } = useDashboardStore();
  const { budgets, loadBudgets } = useBudgetStore();
  const { loans, loadAll: loadPlanner } = usePlannerStore();
  const fulizaLimit = useAppStore((state) => state.settings.fulizaLimit);

  const [feesTotal, setFeesTotal] = useState(0);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  useEffect(() => {
    loadTransactions(repo, true);
  }, [repo, filters.category, filters.type, filters.status, filters.orderBy, filters.period]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTransactions(repo, true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [repo, filters.search]);

  useEffect(() => {
    loadDashboard(db);
    loadBudgets(db);
    loadPlanner(db);
    repo.getFeesTotalForMonth().then(setFeesTotal);
    repo.getUncategorized().then((rows) => setUncategorizedCount(rows.length));
  }, [db, loadDashboard, loadBudgets, loadPlanner, repo]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadTransactions(repo, false);
    }
  }, [isLoading, hasMore, loadTransactions, repo]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.date >= monthStart && t.date <= monthEnd && t.status === 'completed') {
        if (t.transaction_type === 'income') income += t.amount;
        else if (t.transaction_type === 'expense') expense += t.amount;
      }
    }
    return { income, expense };
  }, [transactions]);

  const periodTotals = useMemo(() => {
    const now = new Date();
    let start: string;
    let end: string;
    switch (filters.period) {
      case 'today':
        start = startOfDay(now).toISOString();
        end = endOfDay(now).toISOString();
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        end = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
        break;
      case 'month':
        start = startOfMonth(now).toISOString();
        end = endOfMonth(now).toISOString();
        break;
      default:
        return { income: monthTotals.income, expense: monthTotals.expense };
    }
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.date >= start && t.date <= end && t.status === 'completed') {
        if (t.transaction_type === 'income') income += t.amount;
        else if (t.transaction_type === 'expense') expense += t.amount;
      }
    }
    return { income, expense };
  }, [transactions, filters.period, monthTotals]);

  const topAlertBudget = useMemo(() => {
    if (budgets.length === 0) return null;
    const sorted = [...budgets].sort((a, b) => b.percent - a.percent);
    return sorted.find((b) => b.percent >= 80) ?? sorted[0];
  }, [budgets]);

  const monthEndForecast = useMemo(() => {
    const now = new Date();
    const day = getDate(now);
    const daysInMonth = getDaysInMonth(now);
    if (day === 0 || daysInMonth === 0) return 0;
    return Math.round((monthTotals.expense / day) * daysInMonth);
  }, [monthTotals.expense]);

  const totalMonthBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + (b.budget.limit_amount ?? 0), 0),
    [budgets]
  );

  const spendingVelocity = useMemo(() => {
    if (totalMonthBudget <= 0) return null;
    const now = new Date();
    const dayOfMonth = now.getDate();
    if (dayOfMonth < 3) return null;
    const dailyRate = monthTotals.expense / dayOfMonth;
    const projected = dailyRate * getDaysInMonth(now);
    const overshoot = projected - totalMonthBudget;
    return overshoot > 0 ? { projected, overshoot } : null;
  }, [monthTotals.expense, totalMonthBudget]);

  const fulizaOpenLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);
  const fulizaOutstanding = useMemo(
    () => fulizaOpenLoans.reduce((sum, l) => sum + (l.draw_amount_kes - l.total_repaid_kes), 0),
    [fulizaOpenLoans]
  );

  const exportNudge = useMemo(
    () => ({
      title: 'Exports and reports',
      summary:
        transactions.length === 0
          ? 'Prepare a clean export setup before the ledger grows.'
          : `Create a CSV, JSON, or shareable report from ${transactions.length} visible transactions.`,
      actionLabel: 'Open export center',
    }),
    [transactions.length]
  );

  const actionChips: ActionChip[] = [
    { icon: 'add', label: 'Add', onPress: () => navigation.navigate('TransactionForm') },
    { icon: 'grid-outline', label: 'Hub', onPress: () => navigation.navigate('Planner') },
    { icon: 'chatbubble-outline', label: 'Import SMS', onPress: () => navigation.navigate('CsvImport') },
    { icon: 'document-outline', label: 'Import CSV', onPress: () => navigation.navigate('CsvImport') },
    { icon: 'download-outline', label: 'Export Data', onPress: () => navigation.navigate('Export') },
  ];

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      Alert.alert('Delete transaction', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await repo.softDelete(id);
            await loadTransactions(repo, true);
            await loadDashboard(db);
            await loadBudgets(db);
          },
        },
      ]);
    },
    [repo, loadTransactions, loadDashboard, loadBudgets, db]
  );

  const data: TransactionListItemData[] = transactions.map((t) => ({
    id: t.id,
    merchant: t.merchant,
    category: t.category,
    amount: t.amount,
    date: t.date,
    type: t.transaction_type,
    status: t.status,
    description: t.description,
  }));

  const grouped = useMemo<DateGroup[]>(() => {
    const map = new Map<string, TransactionListItemData[]>();
    for (const item of data) {
      const key = item.date.slice(0, 10);
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => ({
      title: formatRelativeDay(key),
      data: map.get(key) ?? [],
    }));
  }, [data]);

  const renderSectionHeader = (title: string) => (
    <View style={styles.dateHeader}>
      <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const flatData = useMemo(() => {
    const items: ({ kind: 'header'; title: string } | { kind: 'item'; item: TransactionListItemData })[] = [];
    for (const group of grouped) {
      items.push({ kind: 'header', title: group.title });
      for (const item of group.data) {
        items.push({ kind: 'item', item });
      }
    }
    return items;
  }, [grouped]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Finance</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.glassWhite }]}
            onPress={() => navigation.navigate('Planner')}
          >
            <Ionicons name="grid-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.glassWhite }]}
            onPress={() => {
              const next: typeof filters.orderBy =
                filters.orderBy === 'date_desc'
                  ? 'date_asc'
                  : filters.orderBy === 'date_asc'
                  ? 'amount_desc'
                  : filters.orderBy === 'amount_desc'
                  ? 'amount_asc'
                  : 'date_desc';
              setFilters({ orderBy: next });
            }}
          >
            <Ionicons name="swap-vertical" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, index) =>
          item.kind === 'header' ? `hdr-${item.title}-${index}` : item.item.id
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return renderSectionHeader(item.title);
          }
          return (
            <TransactionListItem
              item={item.item}
              onPress={(id) => navigation.navigate('TransactionDetail', { transactionId: id })}
              onDelete={handleDeleteTransaction}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              loadTransactions(repo, true);
              loadDashboard(db);
              loadBudgets(db);
            }}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionChipsContainer}
            >
              {actionChips.map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  style={[styles.actionChip, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
                  onPress={chip.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name={chip.icon} size={16} color={colors.accentPrimary} />
                  <Text style={[styles.actionChipLabel, { color: colors.textPrimary }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsRow}
            >
              <MetricCard label="Today" amount={todaySpend} />
              <MetricCard label="Week" amount={weekSpend} />
              <MetricCard label="Month" amount={monthTotals.expense} />
            </ScrollView>

            {topAlertBudget && (
              <TouchableOpacity
                style={[
                  styles.guardrailBanner,
                  {
                    backgroundColor:
                      topAlertBudget.percent >= 100
                        ? `${colors.danger}16`
                        : `${colors.warning}16`,
                    borderColor:
                      topAlertBudget.percent >= 100 ? colors.danger : colors.warning,
                  },
                ]}
                onPress={() => navigation.navigate('Budgets')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={topAlertBudget.percent >= 100 ? colors.danger : colors.warning}
                />
                <View style={styles.guardrailText}>
                  <Text
                    style={[
                      styles.guardrailTitle,
                      { color: topAlertBudget.percent >= 100 ? colors.danger : colors.warning },
                    ]}
                  >
                    {topAlertBudget.percent >= 100 ? 'Over budget' : 'Approaching budget'}
                  </Text>
                  <Text style={[styles.guardrailSubtitle, { color: colors.textSecondary }]}>
                    {topAlertBudget.budget.category} is {Math.round(topAlertBudget.percent)}% used
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}

            {uncategorizedCount > 0 && (
              <TouchableOpacity
                style={[styles.uncategorizedBanner, { borderColor: colors.border, backgroundColor: colors.glassWhite }]}
                onPress={() => navigation.navigate('Categorize')}
                activeOpacity={0.8}
              >
                <Text style={[styles.uncategorizedText, { color: colors.warning }]}>
                  {uncategorizedCount} transaction{uncategorizedCount === 1 ? '' : 's'} need a category
                </Text>
                <Text style={[styles.uncategorizedAction, { color: colors.accentPrimary }]}>Organize</Text>
              </TouchableOpacity>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsRow}
            >
              <GlassCard style={styles.insightCard}>
                <View style={styles.infoCardHeader}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Budget</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                    <Text style={[styles.infoCardAction, { color: colors.accentPrimary }]}>View</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.infoCardAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(totalMonthBudget, { decimals: 0 })}
                </Text>
                <Text style={[styles.infoCardSub, { color: colors.textTertiary }]}>
                  {budgets.length} guardrail{budgets.length === 1 ? '' : 's'}
                </Text>
              </GlassCard>

              <GlassCard style={styles.insightCard}>
                <View style={styles.infoCardHeader}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Month-End Forecast</Text>
                </View>
                <Text style={[styles.infoCardAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(monthEndForecast, { decimals: 0 })}
                </Text>
                <Text style={[styles.infoCardSub, { color: colors.textTertiary }]}>
                  based on current pace
                </Text>
              </GlassCard>

              {fulizaOpenLoans.length > 0 && (
                <GlassCard style={styles.insightCard}>
                  <View style={styles.infoCardHeader}>
                    <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Fuliza Outstanding</Text>
                  </View>
                  <Text style={[styles.infoCardAmount, { color: colors.warning }]}>
                    {formatCurrency(fulizaOutstanding, { decimals: 0 })}
                  </Text>
                  <Text style={[styles.infoCardSub, { color: colors.textTertiary }]}>
                    {fulizaOpenLoans.length} open loan{fulizaOpenLoans.length === 1 ? '' : 's'}
                    {fulizaLimit ? ` · Limit ${formatCurrency(fulizaLimit, { decimals: 0 })}` : ''}
                  </Text>
                </GlassCard>
              )}

              {feesTotal > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('FeeAnalytics')} activeOpacity={0.8}>
                  <GlassCard style={styles.insightCard}>
                    <View style={styles.infoCardHeader}>
                      <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Service Charges</Text>
                    </View>
                    <Text style={[styles.infoCardAmount, { color: colors.warning }]}>
                      {formatCurrency(feesTotal, { decimals: 0 })}
                    </Text>
                    <Text style={[styles.infoCardSub, { color: colors.textTertiary }]}>
                      Airtime, Fuliza &amp; subscriptions
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              )}

              {spendingVelocity && (
                <GlassCard style={styles.insightCard}>
                  <Text style={[styles.infoCardLabel, { color: colors.warning }]}>Spending pace</Text>
                  <Text style={[styles.infoCardAmount, { color: colors.textPrimary }]} numberOfLines={1}>
                    {formatCurrency(spendingVelocity.projected, { decimals: 0 })} projected
                  </Text>
                  <Text style={[styles.infoCardSub, { color: colors.warning }]} numberOfLines={1}>
                    {formatCurrency(spendingVelocity.overshoot, { decimals: 0 })} over budget
                  </Text>
                </GlassCard>
              )}
            </ScrollView>

            <GlassCard style={styles.nudgeCard}>
              <View style={styles.nudgeHeader}>
                <Text style={[styles.nudgeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {exportNudge.title}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Export')}>
                  <Text style={[styles.nudgeAction, { color: colors.accentPrimary }]}>{exportNudge.actionLabel}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.nudgeSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                {exportNudge.summary}
              </Text>
            </GlassCard>

            <View style={styles.periodFilter}>
              {PERIODS.map((p) => {
                const isSelected = filters.period === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.periodChip,
                      {
                        backgroundColor: isSelected ? colors.accentPrimary : colors.glassWhite,
                        borderColor: isSelected ? colors.accentPrimary : colors.border,
                      },
                    ]}
                    onPress={() => setFilters({ period: p.key })}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        { color: isSelected ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SearchFilterBar
              search={filters.search}
              onSearchChange={(search) => setFilters({ search })}
              hasActiveFilters={filters.type !== undefined || filters.status !== undefined}
              onFilterPress={() => {
                const nextType =
                  filters.type === undefined
                    ? 'expense'
                    : filters.type === 'expense'
                    ? 'income'
                    : filters.type === 'income'
                    ? 'transfer'
                    : undefined;
                setFilters({ type: nextType });
              }}
            />

            <CategoryChips
              categories={CATEGORIES}
              selected={filters.category}
              onSelect={(category) => setFilters({ category })}
            />

            {filters.type && (
              <View style={styles.activeFilterRow}>
                <Text style={[styles.activeFilterText, { color: colors.textSecondary }]} numberOfLines={1}>
                  Type: <Text style={{ color: colors.accentPrimary }}>{filters.type}</Text>
                </Text>
                <TouchableOpacity onPress={() => setFilters({ type: undefined })}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.transactionsHeader}>
              <Text style={[styles.transactionsTitle, { color: colors.textPrimary }]}>
                Transactions
              </Text>
              <Text style={[styles.transactionsCount, { color: colors.textTertiary }]}>
                {data.length}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No transactions found
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentPrimary }]}
        onPress={() => navigation.navigate('TransactionForm')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MetricCard({ label, amount }: { label: string; amount: number }) {
  const colors = useThemeColors();

  return (
    <GlassCard style={styles.metricCard}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricAmount, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
        {formatCurrency(amount, { decimals: 0 })}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionChipsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.base,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  actionChipLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  metricsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  metricCard: {
    width: 140,
    padding: spacing.lg,
  },
  metricLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  metricAmount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  guardrailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  guardrailText: {
    flex: 1,
    marginLeft: spacing.base,
  },
  guardrailTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  guardrailSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  uncategorizedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  uncategorizedText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginRight: spacing.sm,
  },
  uncategorizedAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  insightsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  insightCard: {
    width: 200,
    padding: spacing.base,
  },
  nudgeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    gap: 6,
  },
  nudgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nudgeTitle: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginRight: spacing.sm,
  },
  nudgeAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  nudgeSummary: {
    fontSize: typography.sizes.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardAction: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  infoCardAmount: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  infoCardSub: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  periodFilter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  activeFilterText: {
    fontSize: typography.sizes.sm,
    textTransform: 'capitalize',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  transactionsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  transactionsCount: {
    fontSize: typography.sizes.sm,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  dateHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
