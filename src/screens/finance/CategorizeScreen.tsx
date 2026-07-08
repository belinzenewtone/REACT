import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Card,
  Text,
  Button,
  Chip,
  useTheme,
} from 'react-native-paper';
import { TransactionRepository, type TransactionRecord } from '../../database/repositories/TransactionRepository';
import { MerchantCategoryRepository } from '../../repositories/MerchantCategoryRepository';
import { useTransactionStore } from '../../store';
import { EmptyState } from '../../components/common/EmptyState';
import { TopBanner } from '../../components/common/TopBanner';
import { PageScaffold } from '../../components/common/PageScaffold';
import { CATEGORIZE_CATEGORIES } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { useDataVersion } from '../../store/dataVersion';

interface MerchantGroup {
  merchant: string;
  transactionCount: number;
  totalAmount: number;
  latestDate: string;
}

function toMerchantGroups(transactions: TransactionRecord[]): MerchantGroup[] {
  const byMerchant = new Map<string, TransactionRecord[]>();
  for (const tx of transactions) {
    const list = byMerchant.get(tx.merchant) ?? [];
    list.push(tx);
    byMerchant.set(tx.merchant, list);
  }
  return Array.from(byMerchant.entries())
    .map(([merchant, txs]) => ({
      merchant,
      transactionCount: txs.length,
      totalAmount: txs.reduce((sum, tx) => sum + tx.amount, 0),
      latestDate: txs.reduce((latest, tx) => (tx.date > latest ? tx.date : latest), txs[0].date),
    }))
    .sort((a, b) => (a.latestDate > b.latestDate ? -1 : 1));
}

export function CategorizeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const repo = useMemo(() => new TransactionRepository(db), [db]);
  const { loadTransactions } = useTransactionStore();

  const [groups, setGroups] = useState<MerchantGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const uncategorized = await repo.getUncategorized();
    setGroups(toMerchantGroups(uncategorized));
    setIsLoading(false);
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 1500);
    return () => clearTimeout(timer);
  }, [message]);

  const totalTransactionCount = groups.reduce((sum, g) => sum + g.transactionCount, 0);

  const handleAssign = async (merchant: string, category: string) => {
    animateLayout();
    setGroups((prev) => prev.filter((g) => g.merchant !== merchant));
    try {
      await repo.updateCategoryForMerchant(merchant, category);
      const merchantRepo = new MerchantCategoryRepository(db);
      await merchantRepo.setCategory(merchant, category);
      await loadTransactions(repo, true);
      await checkBudgetThresholds(db, category);
      // Notify every other subscribed surface (Finance dashboard, Budgets,
      // Analytics) that transaction categories changed.
      useDataVersion.getState().bump();
      setMessage({ tone: 'success', text: `Saved for ${merchant}` });
    } catch (error) {
      setMessage({ tone: 'error', text: 'Failed to save category' });
      refresh();
    }
  };

  return (
    <PageScaffold
      eyebrow="Finance"
      title="Categorize"
      onBack={() => navigation.goBack()}
      topBanner={
        message ? (
          <TopBanner tone={message.tone} message={message.text} visible onDismiss={() => setMessage(null)} />
        ) : null
      }
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading uncategorized transactions…
          </Text>
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="All transactions categorized"
          subtitle="Every transaction has a meaningful category. Nice work!"
        />
      ) : (
        <>
          <Text variant="bodyMedium" style={[styles.countLabel, { color: theme.colors.onSurfaceVariant }]}>
            {totalTransactionCount} {totalTransactionCount === 1 ? 'transaction needs' : 'transactions need'} a category
          </Text>
          {groups.map((group) => (
            <MerchantGroupCard key={group.merchant} group={group} onCategorySelected={(cat) => handleAssign(group.merchant, cat)} />
          ))}
        </>
      )}
    </PageScaffold>
  );
}

function MerchantGroupCard({
  group,
  onCategorySelected,
}: {
  group: MerchantGroup;
  onCategorySelected: (category: string) => void;
}) {
  const theme = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <GlassCard style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderText}>
            <View style={styles.merchantRow}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flexShrink: 1 }} numberOfLines={1}>
                {group.merchant}
              </Text>
              <Chip compact style={{ backgroundColor: `${theme.colors.primary}20` }} textStyle={{ color: theme.colors.primary }}>
                {group.transactionCount === 1 ? '1 transaction' : `${group.transactionCount} transactions`}
              </Chip>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Latest: {formatDateTime(group.latestDate, { dateFormat: 'MMM d', use24h: false })}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              {formatCurrency(group.totalAmount)}
            </Text>
            {group.transactionCount > 1 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>total</Text>
            ) : null}
          </View>
        </View>

        <Button
          mode="outlined"
          onPress={() => setPickerOpen(true)}
          style={styles.categoryButton}
          contentStyle={styles.categoryButtonContent}
          textColor={selectedCategory ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
          icon={() => <Ionicons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />}
        >
          {selectedCategory ? capitalize(selectedCategory) : 'Pick a category…'}
        </Button>

        <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
                Pick a category
              </Text>
              <FlashList
                data={CATEGORIZE_CATEGORIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Button
                    mode="text"
                    onPress={() => {
                      setSelectedCategory(item);
                      setPickerOpen(false);
                      onCategorySelected(item);
                    }}
                    style={styles.modalRow}
                    textColor={theme.colors.onSurface}
                  >
                    {capitalize(item)}
                  </Button>
                )}
              />
            </View>
          </View>
        </Modal>
      </Card.Content>
    </GlassCard>
  );
}

function capitalize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['3xl'],
  },
  countLabel: {
    marginBottom: spacing.base,
  },
  card: {
    marginBottom: spacing.base,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  categoryButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.full,
  },
  categoryButtonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalRow: {
    justifyContent: 'flex-start',
  },
});
