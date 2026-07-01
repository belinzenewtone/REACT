import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { GlassCard } from '../../components/common/GlassCard';

type FeeCategory = {
  category: string;
  total: number;
  count: number;
};

type FeeTx = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
};

function FeeBar({ category, maxTotal, colors }: { category: FeeCategory; maxTotal: number; colors: any }) {
  const anim = React.useRef(new Animated.Value(0)).current;
  const ratio = maxTotal > 0 ? category.total / maxTotal : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: ratio,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabel}>
        <Text style={[styles.barCategoryText, { color: colors.textPrimary }]}>
          {category.category.charAt(0).toUpperCase() + category.category.slice(1).toLowerCase()}
        </Text>
        <Text style={[styles.barAmount, { color: colors.warning }]}>
          {formatCurrency(category.total)}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.bgTertiary }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: colors.warning,
              width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

export function FeeAnalyticsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [transactions, setTransactions] = useState<FeeTx[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const feeCategories = ['AIRTIME', 'FULIZA', 'WITHDRAWAL', 'SUBSCRIPTION', 'Fee'];
      const placeholders = feeCategories.map(() => '?').join(',');

      const cats = await db.getAllAsync<{ category: string; total: number; count: number }>(
        `SELECT category, SUM(amount) as total, COUNT(*) as count
         FROM transactions
         WHERE date >= ? AND UPPER(category) IN (${placeholders}) AND deleted_at IS NULL
         GROUP BY category
         ORDER BY total DESC`,
        [startOfMonth, ...feeCategories]
      );
      setCategories(cats);

      const txs = await db.getAllAsync<FeeTx>(
        `SELECT id, merchant, category, amount, date
         FROM transactions
         WHERE date >= ? AND UPPER(category) IN (${placeholders}) AND deleted_at IS NULL
         ORDER BY date DESC
         LIMIT 20`,
        [startOfMonth, ...feeCategories]
      );
      setTransactions(txs);
    } catch (e) {
      console.warn('FeeAnalytics load error', e);
    } finally {
      setIsLoading(false);
    }
  }

  const totalFees = categories.reduce((sum, c) => sum + c.total, 0);
  const maxTotal = Math.max(...categories.map((c) => c.total), 1);

  const isEmpty = !isLoading && categories.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Finance</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Service Charges</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Airtime, Fuliza, withdrawals and subscriptions this month
      </Text>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No service charges this month</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            No airtime, Fuliza, withdrawal, or subscription transactions found.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <GlassCard style={styles.totalCard}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>This Month's Charges</Text>
            <Text style={[styles.totalAmount, { color: colors.warning }]}>{formatCurrency(totalFees)}</Text>
          </GlassCard>

          {categories.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>By Category</Text>
              <GlassCard>
                {categories.map((cat, i) => (
                  <View key={cat.category}>
                    <FeeBar category={cat} maxTotal={maxTotal} colors={colors} />
                    {i < categories.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          {transactions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transactions</Text>
              <GlassCard>
                {transactions.map((tx, i) => (
                  <View key={tx.id}>
                    <View style={styles.txRow}>
                      <View style={styles.txInfo}>
                        <Text style={[styles.txMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                          {tx.merchant || 'Unknown'}
                        </Text>
                        <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                          {tx.category} · {new Date(tx.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[styles.txAmount, { color: colors.textPrimary }]}>
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                    {i < transactions.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                ))}
              </GlassCard>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: {
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  totalCard: { marginBottom: spacing.base },
  totalLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  totalAmount: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.bold },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  barRow: { paddingVertical: spacing.sm },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barCategoryText: { fontSize: typography.sizes.sm },
  barAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  divider: { height: 1, marginVertical: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  txInfo: { flex: 1, marginRight: spacing.sm },
  txMerchant: { fontSize: typography.sizes.sm },
  txMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  txAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: spacing.base, textAlign: 'center' },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: spacing.sm },
});
