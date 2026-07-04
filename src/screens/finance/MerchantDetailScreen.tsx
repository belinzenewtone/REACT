import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Card,
  Text,
  useTheme,
} from 'react-native-paper';
import { spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { PageScaffold } from '../../components/common/PageScaffold';
import type { RootStackParamList } from '../../navigation/types';

type MerchantDetailRoute = RouteProp<RootStackParamList, 'MerchantDetail'>;

type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: string;
  transaction_type: string;
};

function StatColumn({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.statCol}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{value}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

export function MerchantDetailScreen() {
  const theme = useTheme();
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
    <PageScaffold
      eyebrow="Merchant"
      title={merchant || 'Merchant'}
      subtitle={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
      onBack={() => navigation.goBack()}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {transactions.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.base, textAlign: 'center' }}>
              No transactions
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm }}>
              No transactions found for this merchant.
            </Text>
          </View>
        ) : (
          <>
            <Card style={[styles.statsCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
              <Card.Content>
                <View style={styles.statsRow}>
                  <StatColumn label="Total Spend" value={formatCurrency(totalSpend)} />
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <StatColumn label="Transactions" value={`${transactions.length}`} />
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <StatColumn label="Avg. Amount" value={formatCurrency(avgAmount)} />
                </View>
              </Card.Content>
            </Card>

            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Transaction History
            </Text>

            <Card style={{ backgroundColor: theme.colors.surfaceVariant }} mode="elevated">
              <Card.Content>
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
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                            {tx.category.charAt(0).toUpperCase() + tx.category.slice(1).toLowerCase()}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {dateStr} · {timeStr}
                          </Text>
                        </View>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.txAmount,
                            { color: isIncome ? '#34D399' : theme.colors.onSurface },
                          ]}
                        >
                          {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                        </Text>
                      </View>
                      {i < transactions.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                      )}
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
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
  statsCard: {
    marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statCol: {
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  txInfo: {
    flex: 1,
  },
  txAmount: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
});
