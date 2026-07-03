import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';

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
  onDelete?: (id: string) => void;
}

const ACTION_WIDTH = 56;
const SWIPE_THRESHOLD = -(ACTION_WIDTH * 2);

export function TransactionListItem({ item, onPress, onDelete }: TransactionListItemProps) {
  const colors = useThemeColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const open = useCallback(() => {
    Animated.spring(translateX, {
      toValue: SWIPE_THRESHOLD,
      useNativeDriver: true,
      friction: 8,
    }).start();
    isOpen.current = true;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30,
      onPanResponderMove: (_, gestureState) => {
        const x = Math.min(0, Math.max(SWIPE_THRESHOLD, gestureState.dx));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          open();
        } else {
          close();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    close();
    if (onDelete) {
      Alert.alert('Delete transaction', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
      ]);
    }
  };

  const handleCategory = () => {
    close();
    onPress?.(item.id);
  };

  const categoryColor = CATEGORY_COLORS[item.category] ?? colors.textTertiary;
  const iconName = (CATEGORY_ICONS[item.category] ?? 'help-circle') as keyof typeof Ionicons.glyphMap;

  const amountColor =
    item.type === 'income'
      ? colors.success
      : item.type === 'expense'
      ? colors.danger
      : colors.textPrimary;

  const prefix = item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '';

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accentPrimary }]}
          onPress={handleCategory}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.textInverse} />
          <Text style={[styles.actionLabel, { color: colors.textInverse }]} numberOfLines={1}>Category</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
          <Text style={[styles.actionLabel, { color: colors.textInverse }]} numberOfLines={1}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.container, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
          onPress={() => {
            if (isOpen.current) {
              close();
            } else {
              onPress?.(item.id);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={iconName} size={20} color={categoryColor} />
          </View>

          <View style={styles.content}>
            <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.merchant}
            </Text>
            <Text
              style={[styles.category, { color: colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.category}
            </Text>
            {item.description ? (
              <Text style={[styles.description, { color: colors.textTertiary }]} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.amountColumn}>
            <Text style={[styles.amount, { color: amountColor }]}>
              {prefix}
              {formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {formatDate(item.date, 'dd MMM')}
            </Text>
            {item.status !== 'completed' && <StatusBadge status={item.status} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function StatusBadge({ status }: { status: TransactionListItemData['status'] }) {
  const colors = useThemeColors();

  const statusStyles = {
    completed: { color: colors.success, label: 'Completed' },
    pending: { color: colors.warning, label: 'Pending' },
    failed: { color: colors.danger, label: 'Failed' },
    reversed: { color: colors.textTertiary, label: 'Reversed' },
  };

  const { color, label } = statusStyles[status];

  return <Text style={[styles.status, { color }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    marginTop: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    paddingRight: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
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
  description: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginLeft: spacing.base,
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  date: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  status: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
});
