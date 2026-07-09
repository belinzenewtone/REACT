import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, toLocalIso } from '../../utils/formatters';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

type WrappedData = {
  totalSpend: number;
  totalIncome: number;
  txCount: number;
  topCategories: { category: string; amount: number }[];
  topMerchant: { merchant: string; amount: number } | null;
  biggestTx: { merchant: string; amount: number; date: string } | null;
  activeDays: number;
  totalDaysInMonth: number;
  feesTotal: number;
  fulizoTotal: number;
  fulizoCount: number;
};

const RANK_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const RANK_LABELS = ['1st', '2nd', '3rd'];

export function MonthlyWrappedScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [data, setData] = useState<WrappedData | null>(null);

  const now = new Date();
  const monthLabel = format(now, 'MMMM');
  const totalDaysInMonth = getDaysInMonth(now);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const mStart = toLocalIso(startOfMonth(now));
      const mEnd = toLocalIso(endOfMonth(now));
      const spendArgs = [mStart, mEnd];
      const spendWhere = `date >= ? AND date <= ?
          AND transaction_type IN ('expense','transfer','fuliza')
          AND status = 'completed' AND deleted_at IS NULL`;

      const [spendRow, incomeRow, txCountRow, activeDaysRow, feesRow, fulizoRow] = await Promise.all([
        db.getFirstAsync<{ total: number }>(
          `SELECT SUM(amount) as total FROM transactions WHERE ${spendWhere}`,
          spendArgs
        ),
        db.getFirstAsync<{ total: number }>(
          `SELECT SUM(amount) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type = 'income'
               AND status = 'completed' AND deleted_at IS NULL`,
          spendArgs
        ),
        db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM transactions WHERE ${spendWhere}`,
          spendArgs
        ),
        db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(DISTINCT date(date)) as count FROM transactions WHERE ${spendWhere}`,
          spendArgs
        ),
        db.getFirstAsync<{ total: number }>(
          `SELECT SUM(fee) as total FROM transactions
             WHERE date >= ? AND date <= ?
               AND fee > 0 AND status = 'completed' AND deleted_at IS NULL`,
          spendArgs
        ),
        db.getFirstAsync<{ total: number; count: number }>(
          `SELECT SUM(amount) as total, COUNT(*) as count FROM transactions
             WHERE date >= ? AND date <= ?
               AND transaction_type = 'fuliza'
               AND status = 'completed' AND deleted_at IS NULL`,
          spendArgs
        ),
      ]);

      const [catRows, merchantRow, bigTxRow] = await Promise.all([
        db.getAllAsync<{ category: string; total: number }>(
          `SELECT category, SUM(amount) as total FROM transactions
             WHERE ${spendWhere}
             GROUP BY category ORDER BY total DESC LIMIT 3`,
          spendArgs
        ),
        db.getFirstAsync<{ merchant: string; total: number }>(
          `SELECT merchant, SUM(amount) as total FROM transactions
             WHERE ${spendWhere}
             GROUP BY merchant ORDER BY total DESC LIMIT 1`,
          spendArgs
        ),
        db.getFirstAsync<{ merchant: string; amount: number; date: string }>(
          `SELECT merchant, amount, date FROM transactions
             WHERE ${spendWhere}
             ORDER BY amount DESC LIMIT 1`,
          spendArgs
        ),
      ]);

      setData({
        totalSpend: spendRow?.total ?? 0,
        totalIncome: incomeRow?.total ?? 0,
        txCount: txCountRow?.count ?? 0,
        topCategories: catRows.map((r) => ({ category: r.category, amount: r.total })),
        topMerchant: merchantRow ? { merchant: merchantRow.merchant, amount: merchantRow.total } : null,
        biggestTx: bigTxRow ?? null,
        activeDays: activeDaysRow?.count ?? 0,
        totalDaysInMonth,
        feesTotal: feesRow?.total ?? 0,
        fulizoTotal: fulizoRow?.total ?? 0,
        fulizoCount: fulizoRow?.count ?? 0,
      });
    } catch (e) {
      console.warn('MonthlyWrapped load error', e);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const savings = (data?.totalIncome ?? 0) - (data?.totalSpend ?? 0);
  const hasSaved = savings > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
            {monthLabel} Wrapped
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Crunching the numbers…
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.outline} />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.outline, textAlign: 'center', marginTop: spacing.base }}
            >
              Could not load your data. Pull down to retry.
            </Text>
          </View>
        ) : !data || data.totalSpend === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.outline} />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.outline, textAlign: 'center', marginTop: spacing.base }}
            >
              No spending recorded for {monthLabel} yet.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Hero spend ── */}
            <GlassCard style={styles.heroCard}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                You spent
              </Text>
              <Text style={[styles.heroAmount, { color: theme.colors.primary }]}>
                {formatCurrency(data.totalSpend, { decimals: 0 })}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                this month · {data.txCount} transaction{data.txCount !== 1 ? 's' : ''}
              </Text>
            </GlassCard>

            {/* ── Top categories ── */}
            {data.topCategories.length > 0 && (
              <GlassCard>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base }}
                >
                  Top Categories
                </Text>
                {data.topCategories.map((cat, i) => (
                  <View key={cat.category} style={[styles.catRow, i > 0 && { marginTop: spacing.sm }]}>
                    <Text variant="labelMedium" style={{ color: RANK_COLORS[i], width: 28 }}>
                      {RANK_LABELS[i]}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ flex: 1, color: theme.colors.onSurface, textTransform: 'capitalize' }}
                      numberOfLines={1}
                    >
                      {cat.category}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {formatCurrency(cat.amount, { decimals: 0 })}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* ── Top merchant + Biggest spend ── */}
            <View style={styles.twoCol}>
              {data.topMerchant && (
                <GlassCard style={styles.halfCard}>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                  >
                    Top merchant
                  </Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                    {data.topMerchant.merchant}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {formatCurrency(data.topMerchant.amount, { decimals: 0 })}
                  </Text>
                </GlassCard>
              )}
              {data.biggestTx && (
                <GlassCard style={styles.halfCard}>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                  >
                    Biggest spend
                  </Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {formatCurrency(data.biggestTx.amount, { decimals: 0 })}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
                    {data.biggestTx.merchant}
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* ── Active days + Fees ── */}
            <View style={styles.twoCol}>
              <GlassCard style={styles.halfCard}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                >
                  Active days
                </Text>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                  {data.activeDays}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  of {data.totalDaysInMonth} days
                </Text>
              </GlassCard>
              {data.feesTotal > 0 && (
                <GlassCard style={styles.halfCard}>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                  >
                    Fees paid
                  </Text>
                  <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                    {formatCurrency(data.feesTotal, { decimals: 0 })}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    M-Pesa charges
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* ── Fuliza warning (only if used) ── */}
            {data.fulizoCount > 0 && (
              <GlassCard style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.error }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.error, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                >
                  Fuliza used
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {data.fulizoCount} time{data.fulizoCount !== 1 ? 's' : ''} · {formatCurrency(data.fulizoTotal, { decimals: 0 })} total
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                  Try to keep this below 3 times per month
                </Text>
              </GlassCard>
            )}

            {/* ── Savings verdict ── */}
            {data.totalIncome > 0 && (
              <GlassCard style={{ borderLeftWidth: 3, borderLeftColor: hasSaved ? '#22C55E' : theme.colors.error }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}
                >
                  {hasSaved ? 'Saved this month' : 'Spent over income'}
                </Text>
                <Text
                  variant="headlineSmall"
                  style={{ color: hasSaved ? '#22C55E' : theme.colors.error }}
                >
                  {formatCurrency(Math.abs(savings), { decimals: 0 })}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                  Income {formatCurrency(data.totalIncome, { decimals: 0 })} · Spend {formatCurrency(data.totalSpend, { decimals: 0 })}
                </Text>
              </GlassCard>
            )}
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
  heroCard: { paddingVertical: spacing.xl },
  heroAmount: { fontSize: 44, fontWeight: '800', lineHeight: 52, marginVertical: spacing.xs },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  halfCard: { flex: 1 },
});
