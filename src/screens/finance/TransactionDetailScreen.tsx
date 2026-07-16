import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Card,
  Text,
  Button,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useTransactionStore } from '../../store';
import { TransactionRepository, type TransactionRecord } from '../../database/repositories/TransactionRepository';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { PageScaffold } from '../../components/common/PageScaffold';
import type { RootStackParamList } from '../../navigation/types';

type TransactionDetailRouteProp = RouteProp<RootStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen() {
  const theme = useTheme();
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
      <PageScaffold
        title="Transaction"
        onBack={() => navigation.goBack()}
      >
        <View />
      </PageScaffold>
    );
  }

  const categoryColor = CATEGORY_COLORS[transaction.category] ?? theme.colors.onSurfaceVariant;
  const iconName = (CATEGORY_ICONS[transaction.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;
  const typeLabel = transaction.transaction_type;
  const amountColor =
    transaction.transaction_type === 'income'
      ? '#34D399'
      : transaction.transaction_type === 'expense'
      ? theme.colors.error
      : theme.colors.onSurface;

  return (
    <PageScaffold
      title="Transaction"
      onBack={() => navigation.goBack()}
      actions={
        <View style={styles.headerActions}>
          <IconButton
            icon={() => <Ionicons name="share-outline" size={22} color={theme.colors.onSurface} />}
            size={20}
            onPress={handleShare}
          />
          <IconButton
            icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
            size={20}
            onPress={handleDelete}
          />
        </View>
      }
    >
      <GlassCard style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={iconName} size={32} color={categoryColor} />
          </View>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            {transaction.merchant}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
            {transaction.category} · {typeLabel}
          </Text>
          <Text variant="headlineMedium" style={[styles.amount, { color: amountColor }]}>
            {formatCurrency(transaction.amount)}
          </Text>
        </Card.Content>
      </GlassCard>

      <GlassCard style={styles.detailsCard}>
        <Card.Content>
          <DetailRow label="Date" value={formatDateTime(transaction.date)} />
          <DetailRow label="Status" value={transaction.status} />
          {transaction.mpesa_code ? <DetailRow label="M-Pesa Code" value={transaction.mpesa_code} /> : null}
          {!transaction.mpesa_code && transaction.external_ref ? <DetailRow label="Reference" value={transaction.external_ref} /> : null}
          {transaction.description ? <DetailRow label="Description" value={transaction.description} /> : null}
          {transaction.notes ? <DetailRow label="Notes" value={transaction.notes} /> : null}
          {transaction.balance_after !== null && transaction.balance_after !== undefined ? (
            <DetailRow label="Balance After" value={formatCurrency(transaction.balance_after)} />
          ) : null}
          {transaction.fee ? <DetailRow label="Fee" value={formatCurrency(transaction.fee)} /> : null}
        </Card.Content>
      </GlassCard>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('TransactionForm', { transactionId })}
        style={styles.editButton}
      >
        Edit Transaction
      </Button>
    </PageScaffold>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={[styles.rowValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
  card: {
    marginBottom: spacing.base,
    borderRadius: borderRadius['2xl'],
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  amount: {
    marginTop: spacing.base,
  },
  detailsCard: {
    marginBottom: spacing.base,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowValue: {
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.base,
  },
  editButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
});
