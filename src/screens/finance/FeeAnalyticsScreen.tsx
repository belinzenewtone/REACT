import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Card,
  Text,
  useTheme,
} from 'react-native-paper';
import { spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { PageScaffold } from '../../components/common/PageScaffold';

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

const WARNING_COLOR = '#F5CB5C';

function FeeBar({ category, maxTotal }: { category: FeeCategory; maxTotal: number }) {
  const theme = useTheme();
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
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {category.category.charAt(0).toUpperCase() + category.category.slice(1).toLowerCase()}
        </Text>
        <Text variant="bodyMedium" style={{ color: WARNING_COLOR, fontWeight: '500' }}>
          {formatCurrency(category.total)}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.outlineVariant }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: WARNING_COLOR,
              width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

export function FeeAnalyticsScreen() {
  const theme = useTheme();
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
      // Local month start to match SMS-imported transaction date storage.
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

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
    <PageScaffold
      eyebrow="Finance"
      title="Service Charges"
      subtitle="Airtime, Fuliza, withdrawals and subscriptions this month"
      onBack={() => navigation.goBack()}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.base, textAlign: 'center' }}>
              No service charges this month
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm }}>
              No airtime, Fuliza, withdrawal, or subscription transactions found.
            </Text>
          </View>
        ) : (
          <>
            <Card style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  This Month's Charges
                </Text>
                <Text variant="headlineLarge" style={{ color: WARNING_COLOR, marginTop: spacing.xs }}>
                  {formatCurrency(totalFees)}
                </Text>
              </Card.Content>
            </Card>

            {categories.length > 0 && (
              <>
                <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                  By Category
                </Text>
                <Card style={{ backgroundColor: theme.colors.surfaceVariant }} mode="elevated">
                  <Card.Content>
                    {categories.map((cat, i) => (
                      <View key={cat.category}>
                        <FeeBar category={cat} maxTotal={maxTotal} />
                        {i < categories.length - 1 && (
                          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                        )}
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              </>
            )}

            {transactions.length > 0 && (
              <>
                <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Transactions
                </Text>
                <Card style={{ backgroundColor: theme.colors.surfaceVariant }} mode="elevated">
                  <Card.Content>
                    {transactions.map((tx, i) => (
                      <View key={tx.id}>
                        <View style={styles.txRow}>
                          <View style={styles.txInfo}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                              {tx.merchant || 'Unknown'}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {tx.category} · {new Date(tx.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                            {formatCurrency(tx.amount)}
                          </Text>
                        </View>
                        {i < transactions.length - 1 && (
                          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                        )}
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  totalCard: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  barRow: {
    paddingVertical: spacing.sm,
  },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  txInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
});
