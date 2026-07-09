import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Text,
  Chip,
  FAB,
  Button,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useDataVersion } from '../../store/dataVersion';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { useTransactionStore, useDashboardStore, useBudgetStore, usePlannerStore, useAppStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { SearchFilterBar } from '../../components/finance/SearchFilterBar';
import { TransactionListItem } from '../../components/finance/TransactionListItem';
import { Dropdown } from '../../components/common/Dropdown';
import { ImportCsvSheet } from '../../components/finance/ImportCsvSheet';
import { ImportSmsSheet, type SmsScanPeriod } from '../../components/finance/ImportSmsSheet';
import { importHistoricalSms, checkPermissions, requestSmsPermissions } from '../../../modules/lifeos-sms';
import { checkAllBudgetThresholds } from '../../services/budgetAlertService';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency, formatRelativeDay, toLocalIso } from '../../utils/formatters';
import { isOutflow, isInflow } from '../../utils/transactionType';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { FrostCard } from '../../components/common/FrostCard';

import type { TransactionListItemData } from '../../components/finance/TransactionListItem';
import type { TransactionPeriod } from '../../store/useTransactionStore';

const PERIODS: { key: TransactionPeriod; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

interface DateGroup {
  title: string;
  data: TransactionListItemData[];
  dayTotal: number;
}

function FinanceScreenContent() {
  const theme = useTheme();
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
  const { budgets, isLoading: budgetsLoading, loadBudgets } = useBudgetStore();
  const { loans, loadAll: loadPlanner } = usePlannerStore();
  const fulizaLimit = useAppStore((state) => state.settings.fulizaLimit);

  const dataVersion = useDataVersion((s) => s.version);
  const loadedVersion = useRef(-1);
  const [feesTotal, setFeesTotal] = useState(0);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [uncategorizedAmount, setUncategorizedAmount] = useState(0);
  const [csvSheetVisible, setCsvSheetVisible] = useState(false);
  const [smsSheetVisible, setSmsSheetVisible] = useState(false);
  const [smsImporting, setSmsImporting] = useState(false);
  const [smsImportBanner, setSmsImportBanner] = useState<string | null>(null);
  const [smsPermissionsGranted, setSmsPermissionsGranted] = useState(true);
  const [requestingSmsPerms, setRequestingSmsPerms] = useState(false);

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
    repo.getUncategorized().then((rows) => {
      setUncategorizedCount(rows.length);
      setUncategorizedAmount(rows.reduce((sum, r) => sum + r.amount, 0));
    });
  }, [db, loadDashboard, loadBudgets, loadPlanner, repo]);

  const refreshSmsPermissionState = useCallback(async () => {
    try {
      const { receive, read } = await checkPermissions();
      setSmsPermissionsGranted(receive && read);
    } catch {
      setSmsPermissionsGranted(false);
    }
  }, []);

  const handleRequestSmsPermissions = useCallback(async () => {
    setRequestingSmsPerms(true);
    try {
      const { granted } = await requestSmsPermissions();
      await refreshSmsPermissionState();
      if (granted) {
        setSmsImportBanner('SMS access granted · ready to import');
        setTimeout(() => setSmsImportBanner(null), 3000);
      } else {
        setSmsImportBanner('SMS permission denied · enable it in device Settings');
        setTimeout(() => setSmsImportBanner(null), 3000);
      }
    } catch {
      setSmsImportBanner('Could not request SMS permissions');
      setTimeout(() => setSmsImportBanner(null), 3000);
    } finally {
      setRequestingSmsPerms(false);
    }
  }, [refreshSmsPermissionState]);

  useEffect(() => {
    refreshSmsPermissionState();
  }, [refreshSmsPermissionState]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSmsPermissionState();
    });
    return () => sub.remove();
  }, [refreshSmsPermissionState]);

  useFocusEffect(
    useCallback(() => {
      refreshSmsPermissionState();
      if (dataVersion > loadedVersion.current) {
        loadedVersion.current = dataVersion;
        loadTransactions(repo, true);
        loadDashboard(db);
        loadBudgets(db);
        loadPlanner(db);
      }
    }, [repo, db, loadTransactions, loadDashboard, loadBudgets, loadPlanner, dataVersion, refreshSmsPermissionState])
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadTransactions(repo, false);
    }
  }, [isLoading, hasMore, loadTransactions, repo]);

  const handleSmsImport = useCallback(async (period: SmsScanPeriod) => {
    setSmsSheetVisible(false);
    const now = Date.now();
    const periodMs: Record<SmsScanPeriod, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d':  7  * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    setSmsImporting(true);
    setSmsImportBanner('Scanning M-Pesa messages…');
    try {
      const result = await importHistoricalSms(now - periodMs[period], now);
      useDataVersion.getState().bump();
      await loadTransactions(repo, true);
      await loadDashboard(db);
      await loadBudgets(db);
      await loadPlanner(db);
      await checkAllBudgetThresholds(db);
      const imported = result?.imported ?? 0;
      const dupes = result?.duplicates ?? 0;
      const failed = result?.failed ?? 0;
      const total = result?.total ?? 0;
      setSmsImportBanner(
        total === 0
          ? 'No M-Pesa messages found in this window'
          : imported === 0 && dupes > 0 && failed === 0
          ? `Everything up to date · ${dupes} already imported`
          : `Import complete · ${imported} new · ${dupes} dupes · ${failed} failed`
      );
      setTimeout(() => setSmsImportBanner(null), 5000);
    } catch (e: any) {
      const msg: string = e?.message ?? 'unknown error';
      setSmsImportBanner(
        msg.includes('sms_permission_denied')
          ? 'SMS permission denied · grant SMS access and try again'
          : msg.includes('module_unavailable')
          ? 'SMS import needs a development build (not Expo Go) · rebuild with expo run:android'
          : `Import failed: ${msg}`
      );
      setTimeout(() => setSmsImportBanner(null), 6000);
    } finally {
      setSmsImporting(false);
    }
  }, [repo, loadTransactions, loadDashboard, loadBudgets, loadPlanner, db]);

  const activeBudgets = useMemo(() => budgets.filter((b) => b.isActive), [budgets]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const monthStart = toLocalIso(startOfMonth(now));
    const monthEnd = toLocalIso(endOfMonth(now));
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.date >= monthStart && t.date <= monthEnd && t.status === 'completed') {
        if (isInflow(t.transaction_type)) income += t.amount;
        else if (isOutflow(t.transaction_type)) expense += t.amount;
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
        start = toLocalIso(startOfDay(now));
        end = toLocalIso(endOfDay(now));
        break;
      case 'week':
        start = toLocalIso(startOfWeek(now, { weekStartsOn: 1 }));
        end = toLocalIso(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'month':
        start = toLocalIso(startOfMonth(now));
        end = toLocalIso(endOfMonth(now));
        break;
      default:
        return { income: monthTotals.income, expense: monthTotals.expense };
    }
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.date >= start && t.date <= end && t.status === 'completed') {
        if (isInflow(t.transaction_type)) income += t.amount;
        else if (isOutflow(t.transaction_type)) expense += t.amount;
      }
    }
    return { income, expense };
  }, [transactions, filters.period, monthTotals]);

  const topAlertBudget = useMemo(() => {
    if (activeBudgets.length === 0) return null;
    const sorted = [...activeBudgets].sort((a, b) => b.percent - a.percent);
    return sorted.find((b) => b.percent >= 80) ?? sorted[0];
  }, [activeBudgets]);

  const totalMonthBudget = useMemo(
    () => activeBudgets.reduce((sum, b) => sum + (b.budget.limit_amount ?? 0), 0),
    [activeBudgets]
  );

  const activeBudgetsCount = activeBudgets.length;

  const fulizaOpenLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);
  const fulizaOutstanding = useMemo(
    () => fulizaOpenLoans.reduce((sum, l) => sum + (l.draw_amount_kes - l.total_repaid_kes), 0),
    [fulizaOpenLoans]
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
    return sortedKeys.map((key) => {
      const items = map.get(key) ?? [];
      let dayTotal = 0;
      for (const item of items) {
        if (item.status !== 'completed') continue;
        if (isOutflow(item.type)) dayTotal -= item.amount;
        else if (isInflow(item.type)) dayTotal += item.amount;
      }
      return { title: formatRelativeDay(key), data: items, dayTotal };
    });
  }, [data]);

  const renderList = () => {
    if (data.length === 0) {
      return (
        <View style={styles.empty}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No transactions found
          </Text>
        </View>
      );
    }

    return (
      <>
        {grouped.map((group) => (
          <View key={group.title}>
            <View style={styles.dateHeaderRow}>
              <Text variant="labelMedium" style={[styles.dateHeader, { color: theme.colors.onSurfaceVariant }]}>
                {group.title}
              </Text>
              {group.dayTotal !== 0 && (
                <Text variant="labelMedium" style={[styles.dateHeaderTotal, { color: group.dayTotal < 0 ? theme.colors.error : theme.colors.primary }]}>
                  {group.dayTotal > 0 ? '+' : ''}{formatCurrency(group.dayTotal, { decimals: 0 })}
                </Text>
              )}
            </View>
            <Card style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }} mode="elevated">
              {group.data.map((item, index) => (
                <React.Fragment key={item.id}>
                  <TransactionListItem
                    item={item}
                    onPress={(id) => navigation.navigate('TransactionDetail', { transactionId: id })}
                  />
                  {index < group.data.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            Finance
          </Text>
          <IconButton
            icon={() => <Ionicons name="refresh" size={22} color={theme.colors.onSurface} />}
            onPress={() => {
              loadTransactions(repo, true);
              loadDashboard(db);
              loadBudgets(db);
            }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionChipsContainer}>
          <Chip
            icon={() => <Ionicons name="add" size={16} color={theme.colors.onSurface} />}
            onPress={() => navigation.navigate('TransactionForm')}
            style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: spacing.sm }}
          >
            Add
          </Chip>
          <Chip
            icon={() => <Ionicons name="chatbubble-outline" size={16} color={theme.colors.onSurface} />}
            onPress={() => setSmsSheetVisible(true)}
            style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: spacing.sm }}
          >
            Import SMS
          </Chip>
          <Chip
            icon={() => <Ionicons name="document-outline" size={16} color={theme.colors.onSurface} />}
            onPress={() => setCsvSheetVisible(true)}
            style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: spacing.sm }}
          >
            Import CSV
          </Chip>
          <Chip
            icon={() => <Ionicons name="download-outline" size={16} color={theme.colors.onSurface} />}
            onPress={() => navigation.navigate('Export')}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
          >
            Export
          </Chip>
        </ScrollView>

        <View style={styles.heroSection}>
          <FrostCard glow="blue">
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Spent this month
            </Text>
            <Text variant="headlineMedium" style={{
              color: theme.colors.onSurface,
              fontSize: 34,
              fontWeight: '800',
              letterSpacing: -1,
              marginTop: spacing.sm,
            }}>
              {formatCurrency(monthTotals.expense, { decimals: 0 })}
            </Text>
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetric}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Today</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  {formatCurrency(todaySpend, { decimals: 0 })}
                </Text>
              </View>
              <View style={styles.heroMetric}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>This week</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  {formatCurrency(weekSpend, { decimals: 0 })}
                </Text>
              </View>
              <View style={styles.heroMetric}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Income</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  {formatCurrency(monthTotals.income, { decimals: 0 })}
                </Text>
              </View>
            </View>
          </FrostCard>
        </View>

        {topAlertBudget && (
          <Card
            style={[
              styles.guardrailBanner,
              {
                backgroundColor: topAlertBudget.percent >= 100 ? theme.colors.errorContainer : theme.colors.primaryContainer,
                borderColor: topAlertBudget.percent >= 100 ? theme.colors.error : theme.colors.primary,
              },
            ]}
            mode="outlined"
          >
            <Card.Content style={styles.guardrailContent}>
              <Ionicons
                name="alert-circle"
                size={20}
                color={topAlertBudget.percent >= 100 ? theme.colors.error : theme.colors.primary}
              />
              <View style={styles.guardrailText}>
                <Text variant="bodyMedium" style={{ color: topAlertBudget.percent >= 100 ? theme.colors.error : theme.colors.primary }}>
                  {topAlertBudget.percent >= 100 ? 'Over budget' : 'Approaching budget'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {topAlertBudget.budget.category} is {Math.round(topAlertBudget.percent)}% used
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
            </Card.Content>
          </Card>
        )}

        {uncategorizedCount > 0 && (
          <Card
            style={{ backgroundColor: theme.colors.surfaceVariant, marginHorizontal: spacing.lg, marginBottom: spacing.base }}
            mode="elevated"
            onPress={() => navigation.navigate('Categorize')}
          >
            <Card.Content style={styles.uncategorizedContent}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {uncategorizedCount} uncategorized transaction{uncategorizedCount === 1 ? '' : 's'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatCurrency(uncategorizedAmount, { decimals: 0 })} missing from charts
                </Text>
              </View>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Fix →</Text>
            </Card.Content>
          </Card>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsRow}>
          <InsightCard label="Budget" action="View" amount={totalMonthBudget} sub={`${activeBudgetsCount} guardrails`} onAction={() => navigation.navigate('Budgets')} />
          <InsightCard label="Fuliza Outstanding" amount={fulizaOutstanding} sub={`${fulizaOpenLoans.length} open`} />
          {feesTotal > 0 && <InsightCard label="Service Charges" amount={feesTotal} sub="Airtime, Fuliza & subs" />}
        </ScrollView>

        <Dropdown
          label="Period"
          value={filters.period}
          options={PERIODS.map((p) => ({ value: p.key, label: p.label }))}
          onChange={(value) => setFilters({ period: value as TransactionPeriod })}
        />

        <SearchFilterBar
          search={filters.search}
          onSearchChange={(search) => setFilters({ search })}
          placeholder="Name, ref code…"
        />

        {!smsPermissionsGranted && (
          <Card
            mode="outlined"
            onPress={requestingSmsPerms ? undefined : handleRequestSmsPermissions}
            style={[
              styles.smsPermBanner,
              { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
            ]}
          >
            <Card.Content style={styles.smsPermBannerContent}>
              <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.primary }} numberOfLines={2}>
                {requestingSmsPerms
                  ? 'Requesting SMS access…'
                  : 'Tap to enable SMS access for M-Pesa imports'}
              </Text>
              {!requestingSmsPerms && <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />}
            </Card.Content>
          </Card>
        )}

        {smsImportBanner && (
          <View style={[styles.smsBanner, { backgroundColor: smsImporting ? theme.colors.primary : theme.colors.surfaceVariant }]}>
            {smsImporting && <ActivityIndicator size="small" color={theme.colors.onPrimary} style={{ marginRight: 8 }} />}
            <Text variant="bodyMedium" style={[styles.smsBannerText, { color: smsImporting ? theme.colors.onPrimary : theme.colors.onSurface }]} numberOfLines={2}>
              {smsImportBanner}
            </Text>
          </View>
        )}

        <View style={styles.transactionsHeader}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            Transactions
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {data.length}
          </Text>
        </View>

        {renderList()}
      </ScrollView>

      <FAB
        icon={() => <Ionicons name="add" size={28} color={theme.colors.onPrimary} />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('TransactionForm')}
      />

      <ImportCsvSheet
        visible={csvSheetVisible}
        onClose={() => setCsvSheetVisible(false)}
        onFilePicked={(fileUri, fileName) => navigation.navigate('CsvImport', { fileUri, fileName })}
      />
      <ImportSmsSheet
        visible={smsSheetVisible}
        onClose={() => setSmsSheetVisible(false)}
        onSelectPeriod={handleSmsImport}
        isImporting={smsImporting}
      />
    </SafeAreaView>
  );
}

export function FinanceScreen() {
  return <FinanceScreenContent />;
}

function InsightCard({
  label,
  action,
  amount,
  sub,
  onAction,
}: {
  label: string;
  action?: string;
  amount: number;
  sub: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={[styles.insightCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
      <Card.Content>
        <View style={styles.infoCardHeader}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
          {action ? (
            <Button compact mode="text" onPress={onAction} textColor={theme.colors.primary}>
              {action}
            </Button>
          ) : null}
        </View>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginTop: spacing.sm }} numberOfLines={1}>
          {formatCurrency(amount, { decimals: 0 })}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
          {sub}
        </Text>
      </Card.Content>
    </Card>
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
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  actionChipsContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
    paddingBottom: spacing.base,
  },
  metricsRow: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  heroSection: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.base,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 24,
    marginTop: spacing.lg,
  },
  heroMetric: {
    flex: 1,
  },
  metricCard: {
    minWidth: 140,
    width: 'auto',
    padding: spacing.sm,
    paddingRight: spacing.lg,
  },
  guardrailBanner: {
    marginHorizontal: spacing.lg,
    padding: 0,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  guardrailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  guardrailText: {
    flex: 1,
    marginLeft: spacing.base,
  },
  uncategorizedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsRow: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  insightCard: {
    width: 200,
    padding: spacing.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smsPermBanner: {
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.sm,
  },
  smsPermBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  smsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  smsBannerText: {
    flex: 1,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateHeaderTotal: {
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.screenHorizontal,
  },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
