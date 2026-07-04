import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';
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

function StatRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.statRow}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1, textAlign: 'right', fontFamily: 'monospace' as any }}>{value}</Text>
    </View>
  );
}

function BulletCard({ title, items }: { title: string; items: string[] }) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <GlassCard>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>{title}</Text>
      {items.map((item, i) => (
        <View key={i}>
          <View style={styles.bulletRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, width: 20, fontWeight: '700' }}>{i + 1}.</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{item}</Text>
          </View>
          {i < items.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
        </View>
      ))}
    </GlassCard>
  );
}

export function WeekReviewScreen() {
  const theme = useTheme();
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
      const txWeekStart = toLocalIso(weekStart);
      const txWeekEnd = toLocalIso(weekEnd);
      const taskWeekStart = weekStart.toISOString();

      const [spendRow, topCatRow, completedRow, pendingRow] = await Promise.all([
        db.getFirstAsync<{ total: number }>(
          `SELECT SUM(amount) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type IN ('expense', 'transfer', 'fuliza')
               AND status = 'completed'
               AND deleted_at IS NULL`,
          [txWeekStart, txWeekEnd]
        ),
        db.getFirstAsync<{ category: string }>(
          `SELECT category, SUM(amount) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type IN ('expense', 'transfer', 'fuliza')
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
             AND transaction_type IN ('expense', 'transfer', 'fuliza')
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={load}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Weekly Review</Text>
          <View style={{ width: 44 }} />
        </View>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>{weekLabel}</Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Building your review…</Text>
          </View>
        ) : (
          <>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{greeting} 👋</Text>

            {(data.totalSpend > 0 || data.tasksCompleted > 0 || data.tasksPending > 0) && (
              <GlassCard>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>Momentum Check</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Here's how your week shaped up across spending and tasks.
                </Text>
              </GlassCard>
            )}

            <GlassCard>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>Spending</Text>
              <View style={styles.statsStack}>
                <StatRow label="Total this week" value={formatCurrency(data.totalSpend)} />
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                <StatRow label="Posture" value={postureLabel} />
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                <StatRow label="Week delta" value={deltaLabel} />
                {data.topCategory && (
                  <>
                    <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                    <StatRow label="Top category" value={data.topCategory} />
                  </>
                )}
              </View>
            </GlassCard>

            <GlassCard>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>Tasks</Text>
              <View style={styles.statsStack}>
                <StatRow label="Completed this week" value={`${data.tasksCompleted}`} />
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                <StatRow label="Still pending" value={`${data.tasksPending}`} />
              </View>
            </GlassCard>

            <BulletCard title="Wins" items={wins} />
            <BulletCard title="Risks" items={risks} />
            <BulletCard title="Top Insights" items={insights} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
  statsStack: { gap: spacing.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  divider: { height: 1 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
});
