import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

interface MerchantItem {
  merchant: string;
  amount: number;
}

interface TopMerchantsProps {
  merchants: MerchantItem[];
}

export function TopMerchants({ merchants }: TopMerchantsProps) {
  const colors = useThemeColors();

  return (
    <View>
      <SectionHeader title="Top merchants" />
      <GlassCard>
        {merchants.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No merchant data</Text>
        ) : (
          merchants.slice(0, 5).map((item, index) => {
            const maxAmount = merchants[0].amount;
            const percent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

            return (
              <View key={item.merchant} style={styles.row}>
                <Text style={[styles.rank, { color: colors.textTertiary }]}>{index + 1}</Text>
                <View style={styles.content}>
                  <View style={styles.header}>
                    <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                      {item.merchant}
                    </Text>
                    <Text style={[styles.amount, { color: colors.textPrimary }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${percent}%`, backgroundColor: colors.accentPrimary },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </GlassCard>
    </View>
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
    marginBottom: spacing.base,
  },
  rank: {
    width: 24,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  merchant: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  track: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
