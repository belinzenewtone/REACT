import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, useTheme } from 'react-native-paper';
import { subMonths, startOfMonth } from 'date-fns';
import { GlassCard } from '../common/GlassCard';
import { formatCurrency, toLocalIso } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { CATEGORY_COLORS } from '../../constants';

// ─── types ───────────────────────────────────────────────────────────────────

type MonthData = {
  monthKey: string;      // "2026-05"
  label: string;         // "May"
  fullLabel: string;     // "May 2026"
  monthOffset: number;   // 0 = current, -1 = last month, etc.
  expense: number;
  income: number;
  txCount: number;
};

type MonthBreakdown = MonthData & {
  topCategories: { category: string; amount: number; pct: number }[];
  delta: number | null;  // % vs prior month, null for first month
};

type PaydayPulse = {
  postPaydayAvgPerDay: number;
  otherDaysAvgPerDay: number;
  incomeEventsCount: number;
};

type SizeBreakdown = {
  microCount: number;
  mediumCount: number;
  largeCount: number;
  microTotal: number;
  mediumTotal: number;
  largeTotal: number;
};

type InsightsData = {
  months: MonthData[];             // oldest → newest (6 months)
  avgExpense: number;
  totalTracked: number;
  highestMonth: MonthData;
  lowestMonthWithData: MonthData | null;
  topCategoryAllTime: { category: string; pct: number } | null;
  trend: 'increasing' | 'decreasing' | 'stable';
  breakdown: MonthBreakdown[];     // newest → oldest for history display
  paydayPulse: PaydayPulse | null;
  sizeBreakdown: SizeBreakdown;
};

// ─── constants ───────────────────────────────────────────────────────────────

// Extra categories not yet in the canonical map
const EXTRA_CAT_COLORS: Record<string, string> = {
  restaurants: '#F59E0B',
  snacks: '#F97316',
  'loan repayments': '#EF4444',
};

const GOOD = '#22C55E';
const BAD = '#EF4444';
const BAR_MAX_H = 90;

function catColor(cat: string) {
  const key = cat.toLowerCase();
  return CATEGORY_COLORS[key] ?? EXTRA_CAT_COLORS[key] ?? '#6B7280';
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── InsightsTab ──────────────────────────────────────────────────────────────

export function InsightsTab({ dataVersion }: { dataVersion: number }) {
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);

  // One Animated.Value per bar, initialised upfront so hooks count is stable.
  const barAnims = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current;

  // ── data load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const sixMonthsAgo = toLocalIso(startOfMonth(subMonths(now, 5)));

      // All 5 queries are independent — fire in parallel
      const [monthRows, catRows, incomeDateRows, dailySpendRows, sizeRow] = await Promise.all([
        db.getAllAsync<{ month_key: string; expense: number; income: number; tx_count: number }>(
          `SELECT
            strftime('%Y-%m', date) as month_key,
            SUM(CASE WHEN transaction_type IN ('expense','transfer','fuliza') THEN amount ELSE 0 END) as expense,
            SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
            COUNT(CASE WHEN transaction_type IN ('expense','transfer','fuliza') THEN 1 END) as tx_count
          FROM transactions
          WHERE date >= ? AND status = 'completed' AND deleted_at IS NULL
          GROUP BY month_key
          ORDER BY month_key ASC`,
          [sixMonthsAgo]
        ),
        db.getAllAsync<{ month_key: string; category: string; total: number }>(
          `SELECT
            strftime('%Y-%m', date) as month_key,
            category,
            SUM(amount) as total
          FROM transactions
          WHERE date >= ? AND transaction_type IN ('expense','transfer','fuliza')
            AND status = 'completed' AND deleted_at IS NULL
          GROUP BY month_key, category
          ORDER BY month_key ASC, total DESC`,
          [sixMonthsAgo]
        ),
        db.getAllAsync<{ income_date: string }>(
          `SELECT date(date) as income_date
          FROM transactions
          WHERE transaction_type = 'income' AND status = 'completed' AND deleted_at IS NULL
            AND date >= ?
          ORDER BY date DESC LIMIT 12`,
          [sixMonthsAgo]
        ),
        db.getAllAsync<{ day: string; total: number }>(
          `SELECT date(date) as day, SUM(amount) as total
          FROM transactions
          WHERE date >= ? AND transaction_type IN ('expense','transfer','fuliza')
            AND status = 'completed' AND deleted_at IS NULL
          GROUP BY day`,
          [sixMonthsAgo]
        ),
        db.getFirstAsync<{
          micro_count: number; medium_count: number; large_count: number;
          micro_total: number; medium_total: number; large_total: number;
        }>(
          `SELECT
            COUNT(CASE WHEN amount < 500 THEN 1 END) as micro_count,
            COUNT(CASE WHEN amount >= 500 AND amount < 2000 THEN 1 END) as medium_count,
            COUNT(CASE WHEN amount >= 2000 THEN 1 END) as large_count,
            SUM(CASE WHEN amount < 500 THEN amount ELSE 0 END) as micro_total,
            SUM(CASE WHEN amount >= 500 AND amount < 2000 THEN amount ELSE 0 END) as medium_total,
            SUM(CASE WHEN amount >= 2000 THEN amount ELSE 0 END) as large_total
          FROM transactions
          WHERE date >= ? AND transaction_type IN ('expense','transfer','fuliza')
            AND status = 'completed' AND deleted_at IS NULL`,
          [sixMonthsAgo]
        ),
      ]);

      // Build 6-slot array filling in missing months with zero
      const months: MonthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const row = monthRows.find((r) => r.month_key === monthKey);
        months.push({
          monthKey,
          label: d.toLocaleString('default', { month: 'short' }),
          fullLabel: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthOffset: -i,
          expense: row?.expense ?? 0,
          income: row?.income ?? 0,
          txCount: row?.tx_count ?? 0,
        });
      }

      const breakdown: MonthBreakdown[] = months.map((m, i) => {
        const monthCats = catRows.filter((r) => r.month_key === m.monthKey);
        const topCategories = monthCats.slice(0, 5).map((r) => ({
          category: r.category,
          amount: r.total,
          pct: m.expense > 0 ? (r.total / m.expense) * 100 : 0,
        }));
        const prev = months[i - 1];
        const delta = prev && prev.expense > 0
          ? ((m.expense - prev.expense) / prev.expense) * 100
          : null;
        return { ...m, topCategories, delta };
      }).reverse(); // newest first for history list

      // 3. All-time top category (across the 6-month window)
      const allCatMap = new Map<string, number>();
      for (const row of catRows) {
        allCatMap.set(row.category, (allCatMap.get(row.category) ?? 0) + row.total);
      }
      const allCatSorted = Array.from(allCatMap.entries()).sort((a, b) => b[1] - a[1]);
      const grandTotal = allCatSorted.reduce((s, [, v]) => s + v, 0);
      const topCategoryAllTime = allCatSorted.length > 0
        ? { category: allCatSorted[0][0], pct: grandTotal > 0 ? (allCatSorted[0][1] / grandTotal) * 100 : 0 }
        : null;

      // 4. Summary stats
      const monthsWithData = months.filter((m) => m.expense > 0);
      const totalTracked = monthsWithData.reduce((s, m) => s + m.expense, 0);
      const avgExpense = monthsWithData.length > 0 ? totalTracked / monthsWithData.length : 0;
      const highestMonth = monthsWithData.length > 0
        ? monthsWithData.reduce((a, b) => a.expense > b.expense ? a : b)
        : months[months.length - 1];
      const lowestMonthWithData = monthsWithData.length > 1
        ? monthsWithData.reduce((a, b) => a.expense < b.expense ? a : b)
        : null;

      // 5. Trend: last 3 months vs prior 3 months
      const last3Avg = months.slice(3).reduce((s, m) => s + m.expense, 0) / 3;
      const prev3Avg = months.slice(0, 3).reduce((s, m) => s + m.expense, 0) / 3;
      const trendPct = prev3Avg > 0 ? (last3Avg - prev3Avg) / prev3Avg : 0;
      const trend: InsightsData['trend'] =
        trendPct > 0.05 ? 'increasing' : trendPct < -0.05 ? 'decreasing' : 'stable';

      // 6. Payday Pulse
      const dailySpendMap = new Map(dailySpendRows.map((r) => [r.day, r.total]));

      let paydayPulse: PaydayPulse | null = null;
      if (incomeDateRows.length >= 2) {
        const postPaydayDaySet = new Set<string>();
        for (const row of incomeDateRows) {
          const base = new Date(row.income_date);
          for (let d = 0; d < 7; d++) {
            const nd = new Date(base);
            nd.setDate(nd.getDate() + d);
            postPaydayDaySet.add(nd.toISOString().slice(0, 10));
          }
        }
        let postTotal = 0; let postDays = 0;
        let otherTotal = 0; let otherDays = 0;
        for (const [day, total] of dailySpendMap) {
          if (postPaydayDaySet.has(day)) { postTotal += total; postDays++; }
          else { otherTotal += total; otherDays++; }
        }
        if (postDays > 0 && otherDays > 0) {
          paydayPulse = {
            postPaydayAvgPerDay: postTotal / postDays,
            otherDaysAvgPerDay: otherTotal / otherDays,
            incomeEventsCount: incomeDateRows.length,
          };
        }
      }

      setData({
        months,
        avgExpense,
        totalTracked,
        highestMonth,
        lowestMonthWithData,
        topCategoryAllTime,
        trend,
        breakdown,
        paydayPulse,
        sizeBreakdown: {
          microCount: sizeRow?.micro_count ?? 0,
          mediumCount: sizeRow?.medium_count ?? 0,
          largeCount: sizeRow?.large_count ?? 0,
          microTotal: sizeRow?.micro_total ?? 0,
          mediumTotal: sizeRow?.medium_total ?? 0,
          largeTotal: sizeRow?.large_total ?? 0,
        },
      });
    } catch (e) {
      console.warn('InsightsTab load error', e);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Only reload when the tab is actually visible — avoids wasted queries on background dataVersion bumps
  useFocusEffect(
    useCallback(() => { load(); }, [load, dataVersion])
  );

  // Animate bars whenever data changes; reset first so re-loads always grow from zero
  useEffect(() => {
    if (!data) return;
    const maxExpense = Math.max(...data.months.map((m) => m.expense), 1);
    barAnims.forEach((a) => a.setValue(0));
    Animated.parallel(
      data.months.map((m, i) =>
        Animated.timing(barAnims[i], {
          toValue: m.expense / maxExpense,
          duration: 400 + i * 60,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [data]);

  // ── render states ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="small" />
      </View>
    );
  }

  if (!data || data.months.every((m) => m.expense === 0)) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center' }}>
          No spending history yet — add transactions to unlock patterns.
        </Text>
      </View>
    );
  }

  const trendIcon: keyof typeof Ionicons.glyphMap =
    data.trend === 'increasing' ? 'trending-up-outline' :
    data.trend === 'decreasing' ? 'trending-down-outline' : 'remove-outline';
  const trendColor =
    data.trend === 'increasing' ? BAD :
    data.trend === 'decreasing' ? GOOD : theme.colors.onSurfaceVariant;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══ 1. 6-Month Bar Chart ══ */}
      <GlassCard>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base }}
        >
          Monthly Trend
        </Text>
        <View style={styles.barChart}>
          {data.months.map((m, i) => {
            const isCurrent = m.monthOffset === 0;
            const barColor = m.expense === 0
              ? theme.colors.outlineVariant
              : m.expense <= data.avgExpense ? GOOD : BAD;
            return (
              <Pressable
                key={m.monthKey}
                style={styles.barCol}
                onPress={() => {
                  if (m.txCount > 0) {
                    navigation.navigate('MonthlyWrapped', { initialMonthOffset: m.monthOffset });
                  }
                }}
              >
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        height: barAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: barColor,
                        opacity: isCurrent ? 0.65 : 1,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: isCurrent ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chartFooter}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: GOOD }]} />
            <Text style={[styles.barLabel, { color: theme.colors.onSurfaceVariant }]}>Below avg</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BAD }]} />
            <Text style={[styles.barLabel, { color: theme.colors.onSurfaceVariant }]}>Above avg</Text>
          </View>
          <Text style={[styles.barLabel, { color: theme.colors.outline, fontStyle: 'italic' }]}>
            Tap → Wrapped
          </Text>
        </View>
      </GlassCard>

      {/* ══ 2. Summary Tiles ══ */}
      <View style={styles.tilesRow}>
        <GlassCard style={styles.tile}>
          <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
            Average Monthly
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 2 }}>
            {formatCurrency(data.avgExpense, { decimals: 0 })}
          </Text>
        </GlassCard>
        <GlassCard style={styles.tile}>
          <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
            Total Tracked
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 2 }}>
            {formatCurrency(data.totalTracked, { decimals: 0 })}
          </Text>
        </GlassCard>
      </View>

      {/* ══ 3. Spending Insights ══ */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={[styles.headerIconBox, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} />
          </View>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Spending Insights
          </Text>
        </View>

        {/* Highest Month */}
        <Pressable
          style={styles.insightRow}
          onPress={() => navigation.navigate('MonthlyWrapped', { initialMonthOffset: data.highestMonth.monthOffset })}
        >
          <View style={[styles.insightDot, { backgroundColor: `${BAD}20` }]}>
            <Ionicons name="stats-chart" size={14} color={BAD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Highest Month</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {data.highestMonth.fullLabel} · {formatCurrency(data.highestMonth.expense, { decimals: 0 })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.outline} />
        </Pressable>

        {data.lowestMonthWithData && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            <Pressable
              style={styles.insightRow}
              onPress={() => navigation.navigate('MonthlyWrapped', { initialMonthOffset: data.lowestMonthWithData!.monthOffset })}
            >
              <View style={[styles.insightDot, { backgroundColor: `${GOOD}20` }]}>
                <Ionicons name="trending-down-outline" size={14} color={GOOD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Lowest Month</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {data.lowestMonthWithData.fullLabel} · {formatCurrency(data.lowestMonthWithData.expense, { decimals: 0 })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.outline} />
            </Pressable>
          </>
        )}

        {data.topCategoryAllTime && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: `${catColor(data.topCategoryAllTime.category)}20` }]}>
                <Ionicons name="pricetag-outline" size={14} color={catColor(data.topCategoryAllTime.category)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Top Category</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {capitalize(data.topCategoryAllTime.category)} · {data.topCategoryAllTime.pct.toFixed(1)}%
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
        <View style={styles.insightRow}>
          <View style={[styles.insightDot, { backgroundColor: `${trendColor}20` }]}>
            <Ionicons name={trendIcon} size={14} color={trendColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Trend</Text>
            <Text variant="bodyMedium" style={{ color: trendColor, textTransform: 'capitalize' }}>
              {data.trend}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* ══ 4. History Accordion ══ */}
      <Text
        variant="titleSmall"
        style={{ color: theme.colors.onSurface, fontWeight: '700', paddingHorizontal: 2 }}
      >
        History
      </Text>

      {data.breakdown.map((m) => {
        const isExpanded = expandedMonthKey === m.monthKey;
        const deltaColor = m.delta === null || m.delta === 0 ? theme.colors.outlineVariant
          : m.delta > 0 ? BAD : GOOD;
        const rowIconName: keyof typeof Ionicons.glyphMap = m.delta === null || m.delta === 0 ? 'remove-outline'
          : m.delta > 0 ? 'trending-up' : 'trending-down';
        return (
          <GlassCard key={m.monthKey}>
            <Pressable
              style={styles.historyHeader}
              onPress={() => setExpandedMonthKey(isExpanded ? null : m.monthKey)}
            >
              <View style={[styles.historyIconBox, { backgroundColor: `${deltaColor}20` }]}>
                <Ionicons name={rowIconName} size={16} color={deltaColor} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.historyTopRow}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {m.fullLabel}
                  </Text>
                  {m.delta !== null && (
                    <View style={[styles.deltaBadge, { backgroundColor: `${deltaColor}20` }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: deltaColor }}>
                        {m.delta > 0 ? '+' : ''}{m.delta.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  <Text
                    variant="titleSmall"
                    style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 'auto' }}
                  >
                    {formatCurrency(m.expense, { decimals: 0 })}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {m.txCount} transaction{m.txCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.onSurfaceVariant}
                style={{ marginLeft: spacing.sm }}
              />
            </Pressable>

            {isExpanded && m.topCategories.length > 0 && (
              <View style={[styles.historyBody, { borderTopColor: theme.colors.outlineVariant }]}>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                >
                  Top Categories
                </Text>
                {m.topCategories.map((cat, ci) => (
                  <View key={ci} style={styles.catRow}>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurface, width: 110 }}
                      numberOfLines={1}
                    >
                      {capitalize(cat.category)}
                    </Text>
                    <View style={styles.catBarTrack}>
                      <View
                        style={[
                          styles.catBarFill,
                          { width: `${Math.min(cat.pct, 100)}%`, backgroundColor: catColor(cat.category) },
                        ]}
                      />
                    </View>
                    <View style={{ alignItems: 'flex-end', width: 72 }}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                        {formatCurrency(cat.amount, { decimals: 0 })}
                      </Text>
                      <Text style={{ fontSize: 9, color: theme.colors.outline }}>
                        {cat.pct.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        );
      })}

      {/* ══ 5. Payday Pulse ══ */}
      {data.paydayPulse && (() => {
        const pulse = data.paydayPulse!;
        const postHigher = pulse.postPaydayAvgPerDay > pulse.otherDaysAvgPerDay;
        const maxVal = Math.max(pulse.postPaydayAvgPerDay, pulse.otherDaysAvgPerDay, 1);
        const diffPct = pulse.otherDaysAvgPerDay > 0
          ? Math.abs((pulse.postPaydayAvgPerDay - pulse.otherDaysAvgPerDay) / pulse.otherDaysAvgPerDay) * 100
          : 0;
        const pulseRows = [
          { label: 'Post-income (7 days)', val: pulse.postPaydayAvgPerDay, color: postHigher ? BAD : GOOD },
          { label: 'Other days', val: pulse.otherDaysAvgPerDay, color: theme.colors.primary },
        ];
        return (
          <GlassCard>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconBox, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              </View>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                Payday Pulse
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              {pulse.incomeEventsCount} income event{pulse.incomeEventsCount !== 1 ? 's' : ''} · avg daily spend
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: postHigher ? BAD : GOOD, fontWeight: '600', marginBottom: spacing.base }}
            >
              {postHigher
                ? `You spend ${diffPct.toFixed(0)}% more in the 7 days after income arrives`
                : `You spend ${diffPct.toFixed(0)}% less right after income — disciplined!`
              }
            </Text>
            {pulseRows.map((row) => (
              <View key={row.label} style={{ marginBottom: spacing.sm }}>
                <View style={styles.pulseRow}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    {row.label}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {formatCurrency(row.val, { decimals: 0 })}/day
                  </Text>
                </View>
                <View style={styles.catBarTrack}>
                  <View
                    style={[
                      styles.catBarFill,
                      { width: `${(row.val / maxVal) * 100}%`, backgroundColor: row.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </GlassCard>
        );
      })()}

      {/* ══ 6. Spend Anatomy ══ */}
      {(() => {
        const sb = data.sizeBreakdown;
        const totalCount = sb.microCount + sb.mediumCount + sb.largeCount;
        if (totalCount === 0) return null;
        const totalAmt = sb.microTotal + sb.mediumTotal + sb.largeTotal;
        const tiers = [
          { label: 'Micro', range: '< KSh 500', count: sb.microCount, total: sb.microTotal, color: GOOD },
          { label: 'Medium', range: 'KSh 500–2k', count: sb.mediumCount, total: sb.mediumTotal, color: '#F59E0B' },
          { label: 'Large', range: '> KSh 2k', count: sb.largeCount, total: sb.largeTotal, color: BAD },
        ];
        return (
          <GlassCard>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconBox, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="layers-outline" size={16} color="#8B5CF6" />
              </View>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                Spend Anatomy
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>
              How your {totalCount} transactions break down by size
            </Text>
            {tiers.map((tier) => {
              const pctOfCount = totalCount > 0 ? (tier.count / totalCount) * 100 : 0;
              const pctOfAmt = totalAmt > 0 ? (tier.total / totalAmt) * 100 : 0;
              return (
                <View key={tier.label} style={{ marginBottom: spacing.base }}>
                  <View style={styles.pulseRow}>
                    <View style={styles.tierLabelRow}>
                      <View style={[styles.legendDot, { backgroundColor: tier.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                        {tier.label}{' '}
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>({tier.range})</Text>
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {tier.count} txns · {pctOfAmt.toFixed(0)}% of spend
                    </Text>
                  </View>
                  <View style={[styles.catBarTrack, { marginTop: 4 }]}>
                    <View
                      style={[styles.catBarFill, { width: `${pctOfCount}%`, backgroundColor: tier.color }]}
                    />
                  </View>
                </View>
              );
            })}
          </GlassCard>
        );
      })()}
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Bar chart
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_H + 20,
    marginBottom: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTrack: {
    width: '75%',
    height: BAR_MAX_H,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: borderRadius.sm,
  },
  barLabel: { fontSize: 10, lineHeight: 14 },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  // Summary tiles
  tilesRow: { flexDirection: 'row', gap: spacing.base },
  tile: { flex: 1 },

  // Card header (reused across Insights, Payday, Anatomy)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Insight rows
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  insightDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: { height: 1 },

  // History accordion
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'nowrap',
  },
  deltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyBody: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  catBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Payday Pulse + Anatomy
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
});
