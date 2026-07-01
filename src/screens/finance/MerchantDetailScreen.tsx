import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { GlassCard } from '../../components/common/GlassCard';
import type { RootStackParamList } from '../../navigation/types';

type MerchantDetailRoute = RouteProp<RootStackParamList, 'MerchantDetail'>;

type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: string;
  transaction_type: string;
};

function StatColumn({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function MerchantDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const route = useRoute<MerchantDetailRoute>();
  const db = useSQLiteContext();
  const merchant = route.params?.merchant ?? '';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, [merchant]);

  async function load() {
    try {
      const txs = await db.getAllAsync<Transaction>(
        `SELECT id, category, amount, date, transaction_type
         FROM transactions
         WHERE merchant = ? AND deleted_at IS NULL
         ORDER BY date DESC`,
        [merchant]
      );
      setTransactions(txs);
    } catch (e) {
      console.warn('MerchantDetail load error', e);
    } finally {
      setIsLoading(false);
    }
  }

  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const avgAmount = transactions.length > 0 ? totalSpend / transactions.length : 0;

  const INCOME_TYPES = new Set(['RECEIVED', 'DEPOSIT']);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Merchant</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {merchant || 'Merchant'}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </Text>

        {transactions.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No transactions</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              No transactions found for this merchant.
            </Text>
          </View>
        ) : (
          <>
            <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatColumn label="Total Spend" value={formatCurrency(totalSpend)} colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatColumn label="Transactions" value={`${transactions.length}`} colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatColumn label="Avg. Amount" value={formatCurrency(avgAmount)} colors={colors} />
            </View>
          </GlassCard>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transaction History</Text>
          <GlassCard>
            {transactions.map((tx, i) => {
              const isIncome = INCOME_TYPES.has(tx.transaction_type?.toUpperCase());
              const dateStr = new Date(tx.date).toLocaleDateString('en-KE', {
                month: 'short', day: '2-digit', year: 'numeric',
              });
              const timeStr = new Date(tx.date).toLocaleTimeString('en-KE', {
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <View key={tx.id}>
                  <View style={styles.txRow}>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txCategory, { color: colors.textPrimary }]}>
                        {tx.category.charAt(0).toUpperCase() + tx.category.slice(1).toLowerCase()}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {dateStr} · {timeStr}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? colors.success : colors.textPrimary },
                      ]}
                    >
                      {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                  {i < transactions.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
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
    paddingVertical: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm, marginBottom: spacing.base },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'] },
  statsCard: { marginBottom: spacing.base },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  statCol: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  statLabel: { fontSize: typography.sizes.xs },
  statDivider: { width: 1, height: 36 },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  txInfo: { flex: 1 },
  txCategory: { fontSize: typography.sizes.sm },
  txDate: { fontSize: typography.sizes.xs, marginTop: 2 },
  txAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  divider: { height: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: spacing.base, textAlign: 'center' },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: spacing.sm },
});
