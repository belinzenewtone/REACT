import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { formatCurrency, toLocalIso } from '../../utils/formatters';
import { GlassCard } from '../../components/common/GlassCard';
import { useDataVersion } from '../../store/dataVersion';
import { useAppStore } from '../../store';

type ReviewData = {
  totalSpend: number;
  tasksCompleted: number;
  tasksPending: number;
  topCategory: string | null;
  weekDelta: number;
  previousWeekSpend: number;
};

function StatRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary, fontFamily: 'monospace' as any }]}>{value}</Text>
    </View>
  );
}

function BulletCard({ title, items, colors }: { title: string; items: string[]; colors: any }) {
  if (items.length === 0) return null;
  return (
    <GlassCard>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {items.map((item, i) => (
        <View key={i}>
          <View style={styles.bulletRow}>
            <Text style={[styles.bulletNum, { color: colors.accentPrimary }]}>{i + 1}.</Text>
            <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
          </View>
          {i < items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
        </View>
      ))}
    </GlassCard>
  );
}

export function WeekReviewScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReviewData>({
    totalSpend: 0, tasksCompleted: 0, tasksPending: 0,
    topCategory: null, weekDelta: 0, previousWeekSpend: 0,
  });

  const dataVersion = useDataVersion((s) => s.version);
  const loadedVersion = useRef(-1);
  const profileName = useAppStore((s) => s.profile?.name);

  // Recomputed once per render — updates naturally when data reloads.
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profileName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `${timeOfDay}, ${firstName}` : timeOfDay;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Transactions imported from SMS are stored as local wall-clock strings,
      // so query them with local datetime boundaries.
      const txWeekStart = toLocalIso(weekStart);
      const txWeekEnd = toLocalIso(weekEnd);
      // Tasks/events are stored as UTC ISO strings from JS `nowIso()`.
      const taskWeekStart = weekStart.toISOString();

      // `transaction_type` is one of: 'expense' | 'income' | 'transfer' | 'fuliza'.
      // We only sum EXPENSES for the "spend" figure — the prior filter
      // ("NOT IN ('RECEIVED','DEPOSIT')") never matched anything since those
      // are M-Pesa category values, not transaction_type values, so income
      // was being counted as spend.
      const [spendRow, topCatRow, completedRow, pendingRow] = await Promise.all([
        db.getFirstAsync<{ total: number }>(
          `SELECT SUM(amount) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type = 'expense'
               AND status = 'completed'
               AND deleted_at IS NULL`,
          [txWeekStart, txWeekEnd]
        ),
        db.getFirstAsync<{ category: string }>(
          `SELECT category, SUM(amount) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type = 'expense'
               AND status = 'completed'
               AND deleted_at IS NULL
             GROUP BY category ORDER BY total DESC LIMIT 1`,
          [txWeekStart, txWeekEnd]
        ),
        db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM tasks
             WHERE status = 'completed'
               AND (completed_at >= ? OR (completed_at IS NULL AND updated_at >= ?))
               AND deleted_at IS NULL`,
          [taskWeekStart, taskWeekStart]
        ),
        db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM tasks
             WHERE status != 'completed' AND deleted_at IS NULL`,
          []
        ),
      ]);

      const prevStart = new Date(weekStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(weekEnd);
      prevEnd.setDate(prevEnd.getDate() - 7);

      const prevSpendRow = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM transactions
           WHERE date >= ? AND date <= ?
             AND transaction_type = 'expense'
             AND status = 'completed'
             AND deleted_at IS NULL`,
        [toLocalIso(prevStart), toLocalIso(prevEnd)]
      );

      const totalSpend = spendRow?.total ?? 0;
      const prevSpend = prevSpendRow?.total ?? 0;

      setData({
        totalSpend,
        tasksCompleted: completedRow?.count ?? 0,
        tasksPending: pendingRow?.count ?? 0,
        topCategory: topCatRow?.category ?? null,
        weekDelta: totalSpend - prevSpend,
        previousWeekSpend: prevSpend,
      });
    } catch (e) {
      console.warn('WeekReview load error', e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Load on first mount, on focus (if data has changed), and on dataVersion bump.
  useFocusEffect(
    useCallback(() => {
      if (dataVersion !== loadedVersion.current) {
        loadedVersion.current = dataVersion;
        load();
      }
    }, [dataVersion, load])
  );

  useEffect(() => {
    if (loadedVersion.current === -1) {
      loadedVersion.current = dataVersion;
      load();
    }
  }, [dataVersion, load]);

  useEffect(() => {
    if (loadedVersion.current !== -1 && dataVersion !== loadedVersion.current) {
      loadedVersion.current = dataVersion;
      load();
    }
  }, [dataVersion, load]);

  const deltaLabel = data.weekDelta === 0
    ? 'Same as last week'
    : data.weekDelta > 0
      ? `+${formatCurrency(Math.abs(data.weekDelta))} vs last week`
      : `-${formatCurrency(Math.abs(data.weekDelta))} vs last week`;

  const postureLabel = data.totalSpend < 3000 ? 'Conservative' : data.totalSpend < 8000 ? 'Moderate' : 'High spend';

  const wins: string[] = [];
  const risks: string[] = [];

  if (data.tasksCompleted > 0) wins.push(`Completed ${data.tasksCompleted} task${data.tasksCompleted !== 1 ? 's' : ''} this week`);
  if (data.weekDelta < 0) wins.push(`Spent ${formatCurrency(Math.abs(data.weekDelta))} less than last week`);
  if (data.topCategory) wins.push(`Top category: ${data.topCategory}`);

  if (data.tasksPending > 5) risks.push(`${data.tasksPending} tasks still pending`);
  if (data.weekDelta > 2000) risks.push('Spending significantly higher than last week');

  const insights = [
    data.totalSpend > 0 ? `Total spend this week: ${formatCurrency(data.totalSpend)}` : null,
    data.topCategory ? `Highest category: ${data.topCategory}` : null,
    data.tasksCompleted > 0 ? `Task completion: ${data.tasksCompleted} done` : null,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={load}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Weekly Review</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>{weekLabel}</Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accentPrimary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Building your review…</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting} 👋</Text>

          {/* Momentum card — only shown when there's data to report */}
          {(data.totalSpend > 0 || data.tasksCompleted > 0 || data.tasksPending > 0) && (
            <GlassCard>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Momentum Check</Text>
              <Text style={[styles.momentumText, { color: colors.textSecondary }]}>
                Here's how your week shaped up across spending and tasks.
              </Text>
            </GlassCard>
          )}

          {/* Spending */}
          <GlassCard>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Spending</Text>
            <View style={styles.statsStack}>
              <StatRow label="Total this week" value={formatCurrency(data.totalSpend)} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow label="Posture" value={postureLabel} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow label="Week delta" value={deltaLabel} colors={colors} />
              {data.topCategory && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <StatRow label="Top category" value={data.topCategory} colors={colors} />
                </>
              )}
            </View>
          </GlassCard>

          {/* Tasks */}
          <GlassCard>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Tasks</Text>
            <View style={styles.statsStack}>
              <StatRow label="Completed this week" value={`${data.tasksCompleted}`} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow label="Still pending" value={`${data.tasksPending}`} colors={colors} />
            </View>
          </GlassCard>

            <BulletCard title="Wins" items={wins} colors={colors} />
            <BulletCard title="Risks" items={risks} colors={colors} />
            <BulletCard title="Top Insights" items={insights} colors={colors} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  weekLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.base },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  greeting: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  cardTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  momentumText: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.6 },
  statsStack: { gap: spacing.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  statLabel: { fontSize: typography.sizes.sm, flex: 1 },
  statValue: { fontSize: typography.sizes.sm, flex: 1, textAlign: 'right' },
  divider: { height: 1 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  bulletNum: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, width: 20 },
  bulletText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
  loadingText: { fontSize: typography.sizes.sm },
});
