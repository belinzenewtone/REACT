import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, borderRadius } from '../../theme';

export interface TransactionListItemData {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | 'transfer' | 'fuliza';
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  description?: string | null;
}

interface TransactionListItemProps {
  item: TransactionListItemData;
  onPress?: (id: string) => void;
}

export const TransactionListItem = React.memo(function TransactionListItem({ item, onPress }: TransactionListItemProps) {
  const theme = useTheme();

  const categoryColor = CATEGORY_COLORS[item.category] ?? theme.colors.onSurfaceVariant;
  const iconName = (CATEGORY_ICONS[item.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;

  const amountColor =
    item.type === 'income'
      ? theme.colors.primary
      : item.type === 'expense'
      ? theme.colors.error
      : theme.colors.onSurface;

  const prefix = item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '';

  return (
    <TouchableRipple
      onPress={() => onPress?.(item.id)}
      rippleColor={theme.colors.primary}
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.rowInner}>
        <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={iconName} size={20} color={categoryColor} />
        </View>

        <View style={styles.content}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            {item.merchant}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.category, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {item.category}
          </Text>
          {item.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.amountColumn}>
          <Text variant="titleMedium" style={{ color: amountColor }}>
            {prefix}
            {formatCurrency(item.amount)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(item.date, 'dd MMM')}
          </Text>
          {item.status !== 'completed' && <StatusBadge status={item.status} />}
        </View>
      </View>
    </TouchableRipple>
  );
});

function StatusBadge({ status }: { status: TransactionListItemData['status'] }) {
  const theme = useTheme();

  const statusStyles = {
    completed: { color: theme.colors.primary, label: 'Completed' },
    pending: { color: '#F5CB5C', label: 'Pending' },
    failed: { color: theme.colors.error, label: 'Failed' },
    reversed: { color: theme.colors.onSurfaceVariant, label: 'Reversed' },
  };

  const { color, label } = statusStyles[status];

  return (
    <Text variant="labelSmall" style={[styles.status, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    paddingRight: spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  category: {
    marginTop: 2,
    textTransform: 'capitalize',
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginLeft: spacing.base,
  },
  status: {
    marginTop: 2,
  },
});
