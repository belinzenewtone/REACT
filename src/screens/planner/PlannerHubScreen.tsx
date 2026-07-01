import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useBudgetStore, useDashboardStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

type HubItem = {
  icon: any;
  label: string;
  description: string;
  color: string;
  screen: string;
};

const HUB_ITEMS: HubItem[] = [
  { icon: 'wallet-outline', label: 'Budgets', description: 'Spending guardrails', color: '#34D399', screen: 'Budgets' },
  { icon: 'cash-outline', label: 'Income', description: 'Track earnings', color: '#4DB8FF', screen: 'Income' },
  { icon: 'repeat-outline', label: 'Recurring', description: 'Subscriptions', color: '#8B5CF6', screen: 'Recurring' },
  { icon: 'trending-down-outline', label: 'Loans', description: 'Debt & Fuliza', color: '#FF6B6B', screen: 'Loans' },
  { icon: 'receipt-outline', label: 'Bills', description: 'Utilities & rent', color: '#F59E0B', screen: 'Bills' },
  { icon: 'flag-outline', label: 'Goals', description: 'Savings targets', color: '#EC4899', screen: 'Goals' },
  { icon: 'search-outline', label: 'Search', description: 'Find anything', color: '#A78BFA', screen: 'Search' },
  { icon: 'download-outline', label: 'Export', description: 'CSV / JSON', color: '#14B8A6', screen: 'Export' },
];

export function PlannerHubScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { budgets, loadBudgets } = useBudgetStore();
  const { income, expense, loadDashboard } = useDashboardStore();

  useEffect(() => {
    loadBudgets(db);
    loadDashboard(db);
  }, [db]);

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.budget.limit_amount, 0);
  const overBudgetCount = budgets.filter((b) => b.percent > 100).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.overline, { color: colors.textSecondary }]}>Finance Tools</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Finance Hub</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Summary strip ── */}
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="cash-outline" size={16} color={colors.success} />
            </View>
            <Text style={[styles.summaryAmount, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCurrency(income, { decimals: 0 })}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Income</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.danger}20` }]}>
              <Ionicons name="trending-down-outline" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.summaryAmount, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCurrency(expense, { decimals: 0 })}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Expenses</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.accentPrimary}20` }]}>
              <Ionicons name="wallet-outline" size={16} color={colors.accentPrimary} />
            </View>
            <Text style={[styles.summaryAmount, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCurrency(totalBudgetLimit, { decimals: 0 })}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Budget</Text>
          </GlassCard>
        </View>

        {/* ── Alert if over budget ── */}
        {overBudgetCount > 0 && (
          <TouchableOpacity
            style={[styles.alertRow, { backgroundColor: `${colors.danger}18`, borderColor: colors.danger }]}
            onPress={() => navigation.navigate('Budgets')}
          >
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>
              {overBudgetCount} budget{overBudgetCount > 1 ? 's' : ''} exceeded — tap to review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </TouchableOpacity>
        )}

        {/* ── 2-column grid ── */}
        <View style={styles.grid}>
          {HUB_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.gridCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[styles.gridIconBox, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[styles.gridLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.gridDesc, { color: colors.textTertiary }]}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick tips ── */}
        <GlassCard style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.warning} />
            <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>Finance Tips</Text>
          </View>
          {[
            'Set a budget for your top 3 spending categories.',
            'Review recurring charges monthly — cancel what you don\'t use.',
            'Log income sources to track your net position accurately.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.tipNum, { color: colors.accentPrimary }]}>{i + 1}.</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </GlassCard>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  overline: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.lg },
  // Summary
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, gap: 4 },
  summaryIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  summaryAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  summaryLabel: { fontSize: typography.sizes.xs },
  // Alert
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCard: {
    width: '47.5%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: 4,
  },
  gridIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
  gridLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  gridDesc: { fontSize: typography.sizes.xs },
  // Tips
  tipsCard: { gap: spacing.sm },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tipsTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  tipRow: { flexDirection: 'row', gap: spacing.sm },
  tipNum: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, width: 16 },
  tipText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.5 },
});
