import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';

export interface RecentTransactionItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | 'transfer';
}

interface RecentTransactionsProps {
  transactions: RecentTransactionItem[];
  onViewAll?: () => void;
  onTransactionPress?: (id: string) => void;
}

export function RecentTransactions({
  transactions,
  onViewAll,
  onTransactionPress,
}: RecentTransactionsProps) {
  const colors = useThemeColors();

  return (
    <View>
      <SectionHeader title="Recent transactions" actionLabel="See all" onAction={onViewAll} />
      <GlassCard>
        {transactions.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            No transactions yet
          </Text>
        ) : (
          <FlatList
            data={transactions.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionRow
                item={item}
                onPress={() => onTransactionPress?.(item.id)}
              />
            )}
            scrollEnabled={false}
          />
        )}
      </GlassCard>
    </View>
  );
}

function TransactionRow({
  item,
  onPress,
}: {
  item: RecentTransactionItem;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const categoryColor = CATEGORY_COLORS[item.category] ?? colors.textTertiary;
  const iconName = (CATEGORY_ICONS[item.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;
  const amountColor = item.type === 'income' ? colors.success : colors.danger;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
        <Ionicons name={iconName} size={18} color={categoryColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.merchant}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
          {item.category}
        </Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {item.type === 'income' ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatDate(item.date, 'dd MMM')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  merchant: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginRight: spacing.sm,
  },
  category: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  date: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
