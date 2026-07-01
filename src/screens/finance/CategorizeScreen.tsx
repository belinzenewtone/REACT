import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { TransactionRepository, type TransactionRecord } from '../../database/repositories/TransactionRepository';
import { useTransactionStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { TopBanner } from '../../components/common/TopBanner';
import { CATEGORIZE_CATEGORIES } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();
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
    setGroups((prev) => prev.filter((g) => g.merchant !== merchant));
    try {
      await repo.updateCategoryForMerchant(merchant, category);
      await loadTransactions(repo, true);
      setMessage({ tone: 'success', text: `Saved for ${merchant}` });
    } catch (error) {
      setMessage({ tone: 'error', text: 'Failed to save category' });
      refresh();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {message ? (
        <TopBanner tone={message.tone} message={message.text} visible onDismiss={() => setMessage(null)} />
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Finance</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Categorize</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accentPrimary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
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
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
              {totalTransactionCount} {totalTransactionCount === 1 ? 'transaction needs' : 'transactions need'} a category
            </Text>
            {groups.map((group) => (
              <MerchantGroupCard key={group.merchant} group={group} onCategorySelected={(cat) => handleAssign(group.merchant, cat)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MerchantGroupCard({
  group,
  onCategorySelected,
}: {
  group: MerchantGroup;
  onCategorySelected: (category: string) => void;
}) {
  const colors = useThemeColors();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderText}>
          <View style={styles.merchantRow}>
            <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1}>
              {group.merchant}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: `${colors.accentPrimary}20` }]}>
              <Text style={[styles.countBadgeText, { color: colors.accentPrimary }]}>
                {group.transactionCount === 1 ? '1 transaction' : `${group.transactionCount} transactions`}
              </Text>
            </View>
          </View>
          <Text style={[styles.latest, { color: colors.textTertiary }]}>
            Latest: {formatDateTime(group.latestDate, { dateFormat: 'MMM d', use24h: false })}
          </Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(group.totalAmount)}</Text>
          {group.transactionCount > 1 ? (
            <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>total</Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.categoryField, { borderColor: colors.border, backgroundColor: colors.bgTertiary }]}
        onPress={() => setPickerOpen(true)}
      >
        <Text style={[styles.categoryFieldText, { color: selectedCategory ? colors.textPrimary : colors.textTertiary }]}>
          {selectedCategory ? capitalize(selectedCategory) : 'Pick a category…'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pick a category</Text>
            <FlatList
              data={CATEGORIZE_CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedCategory(item);
                    setPickerOpen(false);
                    onCategorySelected(item);
                  }}
                >
                  <Text style={[styles.modalRowText, { color: colors.textPrimary }]}>{capitalize(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 32,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['3xl'],
  },
  loadingText: {
    fontSize: typography.sizes.sm,
  },
  countLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.base,
  },
  card: {
    marginBottom: spacing.base,
    gap: spacing.sm,
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
  merchant: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  latest: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  totalLabel: {
    fontSize: typography.sizes.xs,
  },
  categoryField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    height: 44,
  },
  categoryFieldText: {
    fontSize: typography.sizes.base,
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
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.base,
  },
  modalRow: {
    paddingVertical: spacing.base,
  },
  modalRowText: {
    fontSize: typography.sizes.base,
  },
});
