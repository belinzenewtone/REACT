import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatters';
import { spacing } from '../../theme';

interface MetricCardProps {
  label: string;
  amount: number;
}

export function MetricCard({ label, amount }: MetricCardProps) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
      <Card.Content>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text
          variant="headlineMedium"
          style={{ color: theme.colors.onSurface, marginTop: spacing.sm }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(amount, { decimals: 0 })}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    width: 'auto',
    marginRight: spacing.base,
  },
});
