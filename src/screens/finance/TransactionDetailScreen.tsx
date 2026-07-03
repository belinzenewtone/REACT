import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTransactionStore } from '../../store';
import { TransactionRepository, type TransactionRecord } from '../../database/repositories/TransactionRepository';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import type { RootStackParamList } from '../../navigation/types';

type TransactionDetailRouteProp = RouteProp<RootStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<TransactionDetailRouteProp>();
  const { loadTransactions } = useTransactionStore();

  const transactionId = route.params.transactionId;
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    const repo = new TransactionRepository(db);
    repo.findById(transactionId).then(setTransaction);
  }, [db, transactionId]);

  const handleDelete = () => {
    Alert.alert('Delete transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new TransactionRepository(db);
          await repo.softDelete(transactionId);
          await loadTransactions(repo, true);
          if (transaction?.transaction_type === 'expense' && transaction.category) {
            await checkBudgetThresholds(db, transaction.category);
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!transaction) return;
    const type = transaction.transaction_type;
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '';
    const message = `${prefix}${formatCurrency(transaction.amount)} ${type} to ${transaction.merchant} on ${formatDateTime(transaction.date)}`;
    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categoryColor = CATEGORY_COLORS[transaction.category] ?? colors.textTertiary;
  const iconName = (CATEGORY_ICONS[transaction.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;
  const typeLabel = transaction.transaction_type;
  const amountColor =
    transaction.transaction_type === 'income'
      ? colors.success
      : transaction.transaction_type === 'expense'
      ? colors.danger
      : colors.textPrimary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Transaction</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={iconName} size={32} color={categoryColor} />
          </View>
          <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={2}>{transaction.merchant}</Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>
            {transaction.category} · {typeLabel}
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {formatCurrency(transaction.amount)}
          </Text>
        </View>

        <DetailRow label="Date" value={formatDateTime(transaction.date)} />
        <DetailRow label="Status" value={transaction.status} />
        {transaction.mpesa_code ? <DetailRow label="MPESA Code" value={transaction.mpesa_code} /> : null}
        {transaction.description ? <DetailRow label="Description" value={transaction.description} /> : null}
        {transaction.notes ? <DetailRow label="Notes" value={transaction.notes} /> : null}
        {transaction.balance_after !== null && transaction.balance_after !== undefined ? (
          <DetailRow label="Balance After" value={formatCurrency(transaction.balance_after)} />
        ) : null}
        {transaction.fee ? <DetailRow label="Fee" value={formatCurrency(transaction.fee)} /> : null}

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.accentPrimary }]}
          onPress={() => navigation.navigate('TransactionForm', { transactionId })}
        >
          <Text style={[styles.editButtonText, { color: colors.textInverse }]} numberOfLines={1}>Edit Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
  },
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  merchant: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  category: {
    fontSize: typography.sizes.sm,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  amount: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.base,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
  },
  rowValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.base,
  },
  editButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
