import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography } from '../../theme';

interface WeeklyResetCardProps {
  pendingTaskCount: number;
  onPress?: () => void;
}

export function WeeklyResetCard({ pendingTaskCount, onPress }: WeeklyResetCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly reset</Text>
          <Text style={[styles.action, { color: colors.accentPrimary }]}>Open Weekly Review</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Clear {pendingTaskCount} pending task{pendingTaskCount === 1 ? '' : 's'} before the week closes.
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  action: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
});
