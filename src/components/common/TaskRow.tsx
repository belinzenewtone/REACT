import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface TaskRowProps {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  deadlineLabel?: string;
  timerLabel?: string;
  onPress: () => void;
  onToggleComplete: () => void;
}

export function TaskRow({
  title,
  description,
  priority,
  completed,
  deadlineLabel,
  timerLabel,
  onPress,
  onToggleComplete,
}: TaskRowProps) {
  const colors = useThemeColors();
  const priorityColor = colors.priority[priority];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
    >
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }, completed && styles.completed]} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {deadlineLabel ? (
            <Text style={[styles.meta, { color: colors.textTertiary }]}>{deadlineLabel}</Text>
          ) : null}
          {timerLabel ? (
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={12} color={colors.accentPrimary} />
              <Text style={[styles.timerText, { color: colors.accentPrimary }]}>{timerLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleComplete}
        style={[styles.checkbox, { borderColor: priorityColor }, completed && { backgroundColor: priorityColor }]}
      >
        {completed && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  indicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  meta: {
    fontSize: typography.sizes.xs,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
});
