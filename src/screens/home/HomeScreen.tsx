import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const profile = useAppStore((state) => state.profile);
  const {
    isLoading,
    todaySpend,
    weekSpend,
    expense,
    income,
    pendingTaskCount,
    nextEvent,
    budgets,
    recentTransactions,
    loadDashboard,
  } = useDashboardStore();

  useEffect(() => {
    loadDashboard(db);
  }, [db, loadDashboard]);

  const name = profile?.name?.split(' ')[0] ?? 'there';
  const todayLabel = format(new Date(), 'EEEE, MMM d');
  const greeting = getGreeting();

  const topAlertBudget = budgets.find((b) => b.limit > 0 && (b.spent / b.limit) * 100 >= 80) ?? null;
  const topAlertPercent = topAlertBudget ? (topAlertBudget.spent / topAlertBudget.limit) * 100 : 0;
  const net = income - expense;

  const navigateTab = (tab: string) => navigation.navigate(tab);
  const navigateStack = (screen: string) => navigation.getParent()?.navigate(screen);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadDashboard(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Today</Text>
            <Text style={[styles.headerDate, { color: colors.textSecondary }]}>{todayLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.glassWhite }]}
            onPress={() => navigateTab('Profile')}
          >
            <Text style={[styles.avatarInitial, { color: colors.textPrimary }]}>
              {(profile?.name?.[0] ?? 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Greeting Hero ── */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroLabel, { color: colors.accentPrimary }]}>Daily Focus</Text>
          <Text style={[styles.heroGreeting, { color: colors.textPrimary }]}>
            {greeting}, {name}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Review your priorities, schedule, and spend trend.
          </Text>
        </View>

        {/* ── 3-Metric Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsStrip}
        >
          {([
            { label: 'Today', value: todaySpend, icon: 'today-outline' },
            { label: 'This Week', value: weekSpend, icon: 'calendar-outline' },
            { label: 'This Month', value: expense, icon: 'bar-chart-outline' },
          ] as const).map((m) => (
            <GlassCard key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: `${colors.accentPrimary}20` }]}>
                <Ionicons name={m.icon as any} size={16} color={colors.accentPrimary} />
              </View>
              <Text style={[styles.metricAmount, { color: colors.textPrimary }]} numberOfLines={1}>
                {formatCurrency(m.value, { decimals: 0 })}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{m.label}</Text>
            </GlassCard>
          ))}
        </ScrollView>

        {/* ── Income vs Expense ── */}
        <View style={styles.balanceRow}>
          <GlassCard style={styles.balanceCard}>
            <View style={[styles.balanceDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.balanceAmount, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCurrency(income, { decimals: 0 })}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>Income</Text>
          </GlassCard>
          <GlassCard style={styles.balanceCard}>
            <View style={[styles.balanceDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.balanceAmount, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCurrency(expense, { decimals: 0 })}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>Expenses</Text>
          </GlassCard>
          <GlassCard style={styles.balanceCard}>
            <View style={[styles.balanceDot, { backgroundColor: net >= 0 ? colors.success : colors.danger }]} />
            <Text style={[styles.balanceAmount, { color: net >= 0 ? colors.success : colors.danger }]} numberOfLines={1}>
              {formatCurrency(Math.abs(net), { decimals: 0 })}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>Net</Text>
          </GlassCard>
        </View>

        {/* ── Budget guardrail alert ── */}
        {topAlertBudget && (
          <TouchableOpacity
            style={[styles.alertBanner, {
              backgroundColor: topAlertPercent >= 100 ? `${colors.danger}18` : `${colors.warning}18`,
              borderColor: topAlertPercent >= 100 ? colors.danger : colors.warning,
            }]}
            onPress={() => navigateStack('Budgets')}
          >
            <Ionicons
              name="alert-circle"
              size={18}
              color={topAlertPercent >= 100 ? colors.danger : colors.warning}
            />
            <View style={styles.alertText}>
              <Text style={[styles.alertTitle, { color: topAlertPercent >= 100 ? colors.danger : colors.warning }]}>
                {topAlertPercent >= 100 ? 'Over budget' : 'Approaching limit'}
              </Text>
              <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                {topAlertBudget.category} — {Math.round(topAlertPercent)}% used
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* ── Agenda Card ── */}
        <GlassCard style={styles.agendaCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Agenda</Text>

          <TouchableOpacity style={styles.agendaRow} onPress={() => navigateTab('Calendar')}>
            <View style={[styles.agendaIcon, { backgroundColor: `${colors.accentPrimary}20` }]}>
              <Ionicons name="checkbox-outline" size={16} color={colors.accentPrimary} />
            </View>
            <View style={styles.agendaInfo}>
              <Text style={[styles.agendaLabel, { color: colors.textPrimary }]}>Tasks</Text>
              <Text style={[styles.agendaMeta, { color: colors.textSecondary }]}>
                {pendingTaskCount} pending
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.agendaDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.agendaRow} onPress={() => navigateTab('Calendar')}>
            <View style={[styles.agendaIcon, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.warning} />
            </View>
            <View style={styles.agendaInfo}>
              <Text style={[styles.agendaLabel, { color: colors.textPrimary }]}>Next Event</Text>
              <Text style={[styles.agendaMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {nextEvent ? nextEvent.title : 'No upcoming events'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.agendaDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.agendaRow} onPress={() => navigateStack('Insights')}>
            <View style={[styles.agendaIcon, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="analytics-outline" size={16} color={colors.success} />
            </View>
            <View style={styles.agendaInfo}>
              <Text style={[styles.agendaLabel, { color: colors.textPrimary }]}>Insights</Text>
              <Text style={[styles.agendaMeta, { color: colors.textSecondary }]}>Analytics & trends</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.agendaDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.agendaRow} onPress={() => navigateStack('Search')}>
            <View style={[styles.agendaIcon, { backgroundColor: `${colors.accentSecondary ?? colors.info}20` }]}>
              <Ionicons name="search-outline" size={16} color={colors.accentSecondary ?? colors.info} />
            </View>
            <View style={styles.agendaInfo}>
              <Text style={[styles.agendaLabel, { color: colors.textPrimary }]}>Search</Text>
              <Text style={[styles.agendaMeta, { color: colors.textSecondary }]}>Find anything</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </GlassCard>

        {/* ── Weekly Ritual Card ── */}
        <GlassCard style={styles.ritualCard}>
          <View style={[styles.ritualAccentBar, { backgroundColor: colors.accentPrimary }]} />
          <View style={styles.ritualContent}>
            <Text style={[styles.ritualTitle, { color: colors.textPrimary }]}>Weekly Ritual</Text>
            <Text style={[styles.ritualSub, { color: colors.textSecondary }]}>
              {pendingTaskCount > 0
                ? `${pendingTaskCount} task${pendingTaskCount !== 1 ? 's' : ''} still open — review your week.`
                : 'All caught up! Review and plan your next week.'}
            </Text>
            <TouchableOpacity
              style={[styles.ritualBtn, { backgroundColor: colors.accentPrimary }]}
              onPress={() => navigateStack('WeekReview')}
            >
              <Text style={[styles.ritualBtnText, { color: colors.textInverse }]}>Start Review</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Recent Transactions ── */}
        {recentTransactions.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent</Text>
              <TouchableOpacity onPress={() => navigateTab('Finance')}>
                <Text style={[styles.seeAll, { color: colors.accentPrimary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentTransactions.slice(0, 3).map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={[styles.txRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                onPress={() => navigation.getParent()?.navigate('TransactionDetail', { transactionId: tx.id })}
              >
                <View style={[styles.txIcon, { backgroundColor: `${tx.type === 'income' ? colors.success : colors.accentPrimary}20` }]}>
                  <Ionicons
                    name={tx.type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                    size={18}
                    color={tx.type === 'income' ? colors.success : colors.accentPrimary}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txMerchant, { color: colors.textPrimary }]} numberOfLines={1}>{tx.merchant}</Text>
                  <Text style={[styles.txCategory, { color: colors.textSecondary }]}>{tx.category}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.success : colors.danger }]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, { decimals: 0 })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.lg },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  headerDate: { fontSize: typography.sizes.sm, marginTop: 2 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  // Hero
  heroSection: { gap: 4 },
  heroLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroGreeting: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.bold },
  heroSub: { fontSize: typography.sizes.base, lineHeight: typography.sizes.base * 1.5 },
  // Metrics strip
  metricsStrip: { gap: spacing.sm, paddingRight: spacing.lg },
  metricCard: { width: 130, gap: 4 },
  metricIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  metricAmount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  metricLabel: { fontSize: typography.sizes.xs },
  // Balance row
  balanceRow: { flexDirection: 'row', gap: spacing.sm },
  balanceCard: { flex: 1, gap: 2 },
  balanceDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  balanceAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  balanceLabel: { fontSize: typography.sizes.xs },
  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderRadius: borderRadius.xl, borderWidth: 1,
  },
  alertText: { flex: 1 },
  alertTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  alertSub: { fontSize: typography.sizes.xs, marginTop: 2 },
  // Agenda card
  agendaCard: {},
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  agendaIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  agendaInfo: { flex: 1 },
  agendaLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  agendaMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  agendaDivider: { height: 1 },
  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  seeAll: { fontSize: typography.sizes.sm },
  // Weekly ritual card
  ritualCard: { flexDirection: 'row', overflow: 'hidden', padding: 0, paddingLeft: 0, gap: 0 },
  ritualAccentBar: { width: 4, borderRadius: 4, alignSelf: 'stretch', marginRight: spacing.base },
  ritualContent: { flex: 1, paddingVertical: spacing.base, paddingRight: spacing.base, gap: spacing.sm },
  ritualTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  ritualSub: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.5 },
  ritualBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    gap: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: spacing.base,
  },
  ritualBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  // Recent transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  txCategory: { fontSize: typography.sizes.xs, marginTop: 2 },
  txAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
});
