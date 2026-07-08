import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, borderRadius } from '../../theme';

export interface RecentTransactionItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | 'transfer' | 'fuliza';
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
  return (
    <View>
      <SectionHeader title="Recent transactions" actionLabel="See all" onAction={onViewAll} />
      <GlassCard>
        {transactions.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            No transactions yet
          </Text>
        ) : (
          <FlashList
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
  const theme = useTheme();
  const categoryColor = CATEGORY_COLORS[item.category] ?? theme.colors.onSurfaceVariant;
  const iconName = (CATEGORY_ICONS[item.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;
  const amountColor = item.type === 'income' ? theme.colors.primary : theme.colors.error;

  return (
    <TouchableRipple onPress={onPress} style={styles.row}>
      <View style={styles.rowInner}>
        <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={iconName} size={18} color={categoryColor} />
        </View>
        <View style={styles.content}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            {item.merchant}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
            {item.category}
          </Text>
        </View>
        <View style={styles.amountColumn}>
          <Text variant="bodyMedium" style={{ color: amountColor }} numberOfLines={1}>
            {item.type === 'income' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {formatDate(item.date, 'dd MMM')}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  rowInner: {
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
  amountColumn: {
    alignItems: 'flex-end',
  },
});
