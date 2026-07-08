import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing } from '../../theme';

interface AnalyticsSummaryCardsProps {
  spend: number;
  income: number;
  net: number;
  average: number;
}

const SUCCESS = '#7BC47B';

export function AnalyticsSummaryCards({ spend, income, net, average }: AnalyticsSummaryCardsProps) {
  const theme = useTheme();

  const cards = [
    { label: 'Spend', value: spend, icon: 'arrow-up-circle', color: theme.colors.error },
    { label: 'Income', value: income, icon: 'arrow-down-circle', color: SUCCESS },
    { label: 'Net', value: net, icon: 'wallet', color: net >= 0 ? SUCCESS : theme.colors.error },
    { label: 'Average', value: average, icon: 'stats-chart', color: theme.colors.primary },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <GlassCard key={card.label} style={styles.card}>
          <Ionicons name={card.icon as keyof typeof Ionicons.glyphMap} size={18} color={card.color} />
          <Text variant="titleLarge" style={[styles.value, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {formatCurrency(Math.abs(card.value))}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {card.label}
          </Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  card: {
    flex: 1,
    minWidth: '45%',
  },
  value: {
    marginTop: spacing.sm,
  },
});
