import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

interface WeeklyResetCardProps {
  pendingTaskCount: number;
  onPress?: () => void;
}

export function WeeklyResetCard({ pendingTaskCount, onPress }: WeeklyResetCardProps) {
  const theme = useTheme();

  return (
    <Card style={{ backgroundColor: theme.colors.surfaceVariant }} mode="elevated">
      <TouchableRipple onPress={onPress}>
        <Card.Content>
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
        </Card.Content>
      </TouchableRipple>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
