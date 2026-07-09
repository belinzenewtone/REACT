import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { formatCurrency, toLocalIso } from '../../utils/formatters';
import { GlassCard } from '../../components/common/GlassCard';
import { useDataVersion } from '../../store/dataVersion';
import { useAppStore } from '../../store';

// Mon-first DOW order: 1(Mon)…6(Sat), 0(Sun)
const WEEK_DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = JS getDay()

const BAR_MAX_HEIGHT = 52;

type ReviewData = {
  totalSpend: number;
  tasksCompleted: number;
  tasksPending: number;
  topCategory: string | null;
  weekDelta: number;
  previousWeekSpend: number;
  uncategorizedCount: number;
  fulizoCount: number;
  daySpends: Record<string, number>;  // "YYYY-MM-DD" -> spend
  avgByDow: Record<number, number>;   // 0-6 (JS dow) -> 4-week avg spend
};

function computeHealthScore(d: ReviewData): { score: number; label: string; color: string } {
  let score = 50;

  // Week-on-week delta
  if (d.previousWeekSpend > 0) {
    const pct = (d.weekDelta / d.previousWeekSpend) * 100;
    if (pct <= 0) score += 20;
    else if (pct <= 20) score += 10;
    else if (pct > 50) score -= 20;
  }

  // Categorization completeness
  if (d.uncategorizedCount === 0) score += 20;
  else if (d.uncategorizedCount <= 3) score += 10;
  else if (d.uncategorizedCount > 8) score -= 10;

  // Fuliza usage
  if (d.fulizoCount === 0) score += 10;
  else if (d.fulizoCount > 2) score -= 10;

  // Task completion
  const totalTasks = d.tasksCompleted + d.tasksPending;
  const rate = totalTasks > 0 ? d.tasksCompleted / totalTasks : 1;
  if (rate >= 0.8) score += 10;
  else if (rate >= 0.5) score += 5;

  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs attention';
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';
  return { score, label, color };
}

export function WeekReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReviewData>({
    totalSpend: 0, tasksCompleted: 0, tasksPending: 0,
    topCategory: null, weekDelta: 0, previousWeekSpend: 0,
    uncategorizedCount: 0, fulizoCount: 0,
    daySpends: {}, avgByDow: {},
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

      const prevStart = new Date(weekStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(weekEnd);
      prevEnd.setDate(prevEnd.getDate() - 7);

      const fourWeeksAgo = new Date(weekStart);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const [spendRow, topCatRow, completedRow, pendingRow, uncatRow, fulizoRow, prevSpendRow] =
        await Promise.all([
          db.getFirstAsync<{ total: number }>(
            `SELECT SUM(amount) as total FROM transactions
               WHERE date >= ? AND date <= ?
                 AND transaction_type IN ('expense','transfer','fuliza')
                 AND status = 'completed' AND deleted_at IS NULL`,
            [txWeekStart, txWeekEnd]
          ),
          db.getFirstAsync<{ category: string }>(
            `SELECT category, SUM(amount) as total FROM transactions
               WHERE date >= ? AND date <= ?
                 AND transaction_type IN ('expense','transfer','fuliza')
                 AND status = 'completed' AND deleted_at IS NULL
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
          db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM transactions
               WHERE date >= ? AND date <= ?
                 AND (category IS NULL OR category = '' OR category = 'uncategorized')
                 AND deleted_at IS NULL`,
            [txWeekStart, txWeekEnd]
          ),
          db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM transactions
               WHERE date >= ? AND date <= ?
                 AND transaction_type = 'fuliza'
                 AND status = 'completed' AND deleted_at IS NULL`,
            [txWeekStart, txWeekEnd]
          ),
          db.getFirstAsync<{ total: number }>(
            `SELECT SUM(amount) as total FROM transactions
               WHERE date >= ? AND date <= ?
                 AND transaction_type IN ('expense','transfer','fuliza')
                 AND status = 'completed' AND deleted_at IS NULL`,
            [toLocalIso(prevStart), toLocalIso(prevEnd)]
          ),
        ]);

      // Per-day spend this week
      const dayRows = await db.getAllAsync<{ day: string; total: number }>(
        `SELECT date(date) as day, SUM(amount) as total FROM transactions
           WHERE date >= ? AND date <= ?
             AND transaction_type IN ('expense','transfer','fuliza')
             AND status = 'completed' AND deleted_at IS NULL
           GROUP BY day`,
        [txWeekStart, txWeekEnd]
      );
      const daySpends: Record<string, number> = {};
      for (const row of dayRows) daySpends[row.day] = row.total;

      // 4-week daily average by day-of-week (prior 4 complete weeks)
      const avgRows = await db.getAllAsync<{ dow: string; avg_amount: number }>(
        `SELECT dow, AVG(day_total) as avg_amount FROM (
           SELECT date(date) as d, strftime('%w', date) as dow, SUM(amount) as day_total
           FROM transactions
           WHERE date >= ? AND date < ?
             AND transaction_type IN ('expense','transfer','fuliza')
             AND status = 'completed' AND deleted_at IS NULL
           GROUP BY d
         ) GROUP BY dow`,
        [toLocalIso(fourWeeksAgo), txWeekStart]
      );
      const avgByDow: Record<number, number> = {};
      for (const row of avgRows) avgByDow[parseInt(row.dow, 10)] = row.avg_amount;

      const totalSpend = spendRow?.total ?? 0;
      const prevSpend = prevSpendRow?.total ?? 0;

      setData({
        totalSpend,
        tasksCompleted: completedRow?.count ?? 0,
        tasksPending: pendingRow?.count ?? 0,
        topCategory: topCatRow?.category ?? null,
        weekDelta: totalSpend - prevSpend,
        previousWeekSpend: prevSpend,
        uncategorizedCount: uncatRow?.count ?? 0,
        fulizoCount: fulizoRow?.count ?? 0,
        daySpends,
        avgByDow,
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

  const { score, label: scoreLabel, color: scoreColor } = computeHealthScore(data);

  // Build 7-day bar data (Mon → Sun)
  const dayBars = WEEK_DOW_ORDER.map((dow) => {
    const offset = dow === 0 ? 6 : dow - 1; // days after Monday
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    const dateStr = format(d, 'yyyy-MM-dd');
    const amount = data.daySpends[dateStr] ?? 0;
    const avg = data.avgByDow[dow] ?? 0;
    const isFuture = d > now;
    let barColor: string;
    if (isFuture || amount === 0) {
      barColor = theme.colors.outlineVariant;
    } else if (avg === 0 || amount <= avg) {
      barColor = '#22C55E'; // Normal
    } else if (amount <= avg * 1.5) {
      barColor = '#F59E0B'; // High
    } else {
      barColor = '#EF4444'; // Peak
    }
    return { dow, label: DOW_LABELS[dow], amount, isFuture, barColor, dateStr };
  });
  const maxDaySpend = Math.max(...dayBars.map((b) => b.amount), 1);

  // "What Changed?" narrative items — max 3, prioritised
  type NarrativeItem = { icon: keyof typeof Ionicons.glyphMap; text: string; sentiment: 'good' | 'warn' | 'neutral' };
  const narratives: NarrativeItem[] = [];

  if (data.previousWeekSpend > 0) {
    if (data.weekDelta < 0) {
      narratives.push({ icon: 'trending-down-outline', text: `Saved ${formatCurrency(Math.abs(data.weekDelta), { decimals: 0 })} vs last week`, sentiment: 'good' });
    } else if (data.weekDelta > 0) {
      narratives.push({ icon: 'trending-up-outline', text: `Spent ${formatCurrency(data.weekDelta, { decimals: 0 })} more than last week`, sentiment: 'warn' });
    }
  }
  if (data.fulizoCount > 0) {
    narratives.push({ icon: 'warning-outline', text: `Fuliza used ${data.fulizoCount} time${data.fulizoCount !== 1 ? 's' : ''} — watch this`, sentiment: 'warn' });
  }
  if (data.uncategorizedCount > 0) {
    narratives.push({ icon: 'alert-circle-outline', text: `${data.uncategorizedCount} transaction${data.uncategorizedCount !== 1 ? 's' : ''} still need categorizing`, sentiment: 'warn' });
  }
  if (narratives.length < 3 && data.tasksCompleted > 0) {
    narratives.push({ icon: 'checkmark-circle-outline', text: `${data.tasksCompleted} task${data.tasksCompleted !== 1 ? 's' : ''} completed this week`, sentiment: 'good' });
  }
  if (narratives.length < 3 && data.topCategory) {
    narratives.push({ icon: 'bar-chart-outline', text: `Most spent on ${data.topCategory}`, sentiment: 'neutral' });
  }
  const topNarratives = narratives.slice(0, 3);

  const sentimentColor = (s: NarrativeItem['sentiment']) =>
    s === 'good' ? '#22C55E' : s === 'warn' ? '#F59E0B' : theme.colors.onSurfaceVariant;

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
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            Weekly Review
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{weekLabel}</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{greeting}</Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Building your review…
            </Text>
          </View>
        ) : (
          <>
            {/* ── Financial Health Score hero ── */}
            <GlassCard style={styles.scoreCard}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
              </View>
              <Text
                variant="titleMedium"
                style={{ color: scoreColor, marginTop: spacing.sm, fontWeight: '700' }}
              >
                {scoreLabel}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}
              >
                Financial Health Score · spend, categorization & tasks
              </Text>
            </GlassCard>

            {/* ── 7-day spend pattern bar chart ── */}
            <GlassCard>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base }}
              >
                7-Day Spend Pattern
              </Text>
              <View style={styles.chartRow}>
                {dayBars.map((bar, i) => {
                  const barH = Math.max((bar.amount / maxDaySpend) * BAR_MAX_HEIGHT, bar.amount > 0 ? 2 : 0);
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: barH,
                              backgroundColor: bar.barColor,
                              opacity: bar.isFuture || bar.amount === 0 ? 0.25 : 1,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.barLabel,
                          { color: bar.isFuture ? theme.colors.outline : theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {bar.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legendRow}>
                {([['#22C55E', 'Normal'], ['#F59E0B', 'High'], ['#EF4444', 'Peak']] as [string, string][]).map(([color, label]) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={[styles.barLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* ── What Changed? narrative cards ── */}
            {topNarratives.length > 0 && (
              <GlassCard>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                >
                  What Changed?
                </Text>
                {topNarratives.map((item, i) => (
                  <View key={i}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
                    <View style={styles.narrativeRow}>
                      <Ionicons name={item.icon} size={16} color={sentimentColor(item.sentiment)} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                        {item.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* ── Spending summary (trimmed) ── */}
            <GlassCard>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
              >
                Spending
              </Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                {formatCurrency(data.totalSpend, { decimals: 0 })}
              </Text>
              {data.topCategory ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs, textTransform: 'capitalize' }}
                >
                  Top category: {data.topCategory}
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: spacing.xs }}>
                  No spend recorded yet
                </Text>
              )}
            </GlassCard>

            {/* ── Tasks (trimmed) ── */}
            <GlassCard>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base }}
              >
                Tasks
              </Text>
              <View style={styles.tasksRow}>
                <View style={styles.taskStat}>
                  <Text variant="headlineMedium" style={{ color: '#22C55E', fontWeight: '700' }}>
                    {data.tasksCompleted}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Done</Text>
                </View>
                <View style={[styles.taskDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.taskStat}>
                  <Text
                    variant="headlineMedium"
                    style={{ color: data.tasksPending > 5 ? '#F59E0B' : theme.colors.onSurface, fontWeight: '700' }}
                  >
                    {data.tasksPending}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Pending</Text>
                </View>
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  centered: { paddingTop: spacing['4xl'], alignItems: 'center', gap: spacing.base },

  // Health score hero
  scoreCard: { alignItems: 'center', paddingVertical: spacing.xl },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: { fontSize: 36, fontWeight: '700', lineHeight: 42 },

  // 7-day chart
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 20, // bars + label
    marginBottom: spacing.sm,
    gap: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barTrack: { width: '70%', alignItems: 'center', justifyContent: 'flex-end', height: BAR_MAX_HEIGHT },
  barFill: { width: '100%', borderRadius: borderRadius.sm },
  barLabel: { fontSize: 10, lineHeight: 14 },
  legendRow: { flexDirection: 'row', gap: spacing.base },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  // Narratives
  narrativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: { height: 1 },

  // Tasks
  tasksRow: { flexDirection: 'row', alignItems: 'center' },
  taskStat: { flex: 1, alignItems: 'center', gap: 2 },
  taskDivider: { width: 1, height: 44 },
});
