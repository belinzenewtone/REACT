import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing } from '../../theme';
import type { FeesData } from '../../services/analyticsService';

export function FeesCard({ total, topCategory, avgFee, txCount }: FeesData) {
  const theme = useTheme();

  if (total === 0) return null;

  return (
    <GlassCard>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={15} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Transaction Fees
        </Text>
      </View>

      <Text variant="headlineSmall" style={{ color: theme.colors.primary, marginVertical: spacing.sm }}>
        {formatCurrency(total, { decimals: 0 })}
      </Text>

      <View style={styles.statsRow}>
        {topCategory && (
          <View style={styles.stat}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Top category</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textTransform: 'capitalize' }} numberOfLines={1}>
              {topCategory}
            </Text>
          </View>
        )}
        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Avg fee</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {formatCurrency(avgFee)} · {txCount} tx
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stat: {
    gap: 2,
  },
});
