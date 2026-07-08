import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';
import { FrostCard } from '../common/FrostCard';

interface WeeklyResetCardProps {
  pendingTaskCount: number;
  onPress?: () => void;
}

export function WeeklyResetCard({ pendingTaskCount, onPress }: WeeklyResetCardProps) {
  const theme = useTheme();

  return (
    <FrostCard glow="teal" onPress={onPress}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
          Weekly reset
        </Text>
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          Open Weekly Review
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
        Clear {pendingTaskCount} pending task{pendingTaskCount === 1 ? '' : 's'} before the week closes.
      </Text>
    </FrostCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
