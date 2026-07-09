import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

interface SpendingComparisonCardProps {
  currentMonthSpend: number;
  prevMonthSpend: number;
}

export function SpendingComparisonCard({ currentMonthSpend, prevMonthSpend }: SpendingComparisonCardProps) {
  const theme = useTheme();

  if (currentMonthSpend === 0 && prevMonthSpend === 0) return null;

  const maxSpend = Math.max(currentMonthSpend, prevMonthSpend, 1);
  const delta = currentMonthSpend - prevMonthSpend;
  const isOver = delta > 0;
  const currentColor = isOver ? theme.colors.error : theme.colors.primary;

  return (
    <GlassCard>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base }}
      >
        vs Last Month
      </Text>

      <View style={styles.row}>
        <Text variant="bodySmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Last month</Text>
        <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
          <View
            style={[styles.fill, {
              width: `${(prevMonthSpend / maxSpend) * 100}%`,
              backgroundColor: theme.colors.outline,
            }]}
          />
        </View>
        <Text variant="bodySmall" style={[styles.amount, { color: theme.colors.onSurfaceVariant }]}>
          {formatCurrency(prevMonthSpend, { decimals: 0 })}
        </Text>
      </View>

      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <Text variant="bodySmall" style={[styles.label, { color: theme.colors.onSurface }]}>This month</Text>
        <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
          <View
            style={[styles.fill, {
              width: `${(currentMonthSpend / maxSpend) * 100}%`,
              backgroundColor: currentColor,
            }]}
          />
        </View>
        <Text variant="bodySmall" style={[styles.amount, { color: currentColor, fontWeight: '700' }]}>
          {formatCurrency(currentMonthSpend, { decimals: 0 })}
        </Text>
      </View>

      {prevMonthSpend > 0 && (
        <View style={[styles.deltaChip, { backgroundColor: `${currentColor}18` }]}>
          <Ionicons name={isOver ? 'arrow-up' : 'arrow-down'} size={12} color={currentColor} />
          <Text variant="bodySmall" style={{ color: currentColor }}>
            {isOver ? 'Spent' : 'Saved'} {formatCurrency(Math.abs(delta), { decimals: 0 })} {isOver ? 'more' : 'less'} than last month
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 84,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  amount: {
    width: 76,
    textAlign: 'right',
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.base,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
});
