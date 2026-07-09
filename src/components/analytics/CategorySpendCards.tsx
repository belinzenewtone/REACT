import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { formatCurrency } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import type { CategorySparklineItem } from '../../services/analyticsService';

interface CategorySpendCardsProps {
  items: CategorySparklineItem[];
}

function MiniSparkline({ amounts, color }: { amounts: number[]; color: string }) {
  const max = Math.max(...amounts, 1);
  return (
    <View style={styles.sparkline}>
      {amounts.map((val, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            {
              height: Math.max((val / max) * 28, val > 0 ? 3 : 1),
              backgroundColor: val > 0 ? color : '#33333330',
              opacity: val > 0 ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function CategorySpendCards({ items }: CategorySpendCardsProps) {
  const theme = useTheme();
  const visible = items.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <View>
      <SectionHeader title="Spending by Category" />
      {visible.map((item) => (
        <GlassCard key={item.category} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text
              variant="bodyMedium"
              style={{ flex: 1, color: theme.colors.onSurface, textTransform: 'capitalize' }}
              numberOfLines={1}
            >
              {item.category}
            </Text>
            <View style={styles.amountBlock}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {formatCurrency(item.total, { decimals: 0 })}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.pctOfTotal.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            {item.topMerchant ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                Top: {item.topMerchant}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <MiniSparkline amounts={item.weeklyAmounts} color={item.color} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
  },
  sparkBar: {
    width: 8,
    borderRadius: 2,
  },
});
