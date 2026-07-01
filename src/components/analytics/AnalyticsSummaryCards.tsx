import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography } from '../../theme';

interface AnalyticsSummaryCardsProps {
  spend: number;
  income: number;
  net: number;
  average: number;
}

export function AnalyticsSummaryCards({ spend, income, net, average }: AnalyticsSummaryCardsProps) {
  const colors = useThemeColors();

  const cards = [
    { label: 'Spend', value: spend, icon: 'arrow-up-circle', color: colors.danger },
    { label: 'Income', value: income, icon: 'arrow-down-circle', color: colors.success },
    { label: 'Net', value: net, icon: 'wallet', color: net >= 0 ? colors.success : colors.danger },
    { label: 'Average', value: average, icon: 'stats-chart', color: colors.accentPrimary },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <GlassCard key={card.label} style={styles.card}>
          <Ionicons name={card.icon as keyof typeof Ionicons.glyphMap} size={18} color={card.color} />
          <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
            {formatCurrency(Math.abs(card.value))}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>{card.label}</Text>
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
