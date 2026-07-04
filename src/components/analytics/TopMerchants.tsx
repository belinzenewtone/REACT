import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

interface MerchantItem {
  merchant: string;
  amount: number;
}

interface TopMerchantsProps {
  merchants: MerchantItem[];
}

export function TopMerchants({ merchants }: TopMerchantsProps) {
  const theme = useTheme();

  return (
    <View>
      <SectionHeader title="Top merchants" />
      <GlassCard>
        {merchants.length === 0 ? (
          <Text variant="bodyLarge" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            No merchant data
          </Text>
        ) : (
          merchants.slice(0, 5).map((item, index) => {
            const maxAmount = merchants[0].amount;
            const percent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

            return (
              <View key={item.merchant} style={styles.row}>
                <Text variant="bodySmall" style={[styles.rank, { color: theme.colors.onSurfaceVariant }]}>
                  {index + 1}
                </Text>
                <View style={styles.content}>
                  <View style={styles.header}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1} ellipsizeMode="tail">
                      {item.merchant}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${percent}%`, backgroundColor: theme.colors.primary },
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  rank: {
    width: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
