import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatRelativeDay, formatTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import type { TaskRecord } from '../../database/repositories/TaskRepository';

interface CalendarTaskItemProps {
  task: TaskRecord;
  onPress: () => void;
  onToggleComplete: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CalendarTaskItem({ task, onPress, onToggleComplete }: CalendarTaskItemProps) {
  const colors = useThemeColors();
  const priorityColor = colors.priority[task.priority];
  const isCompleted = task.status === 'completed';
  const hasTimer = (task.time_spent_seconds ?? 0) > 0 && !isCompleted;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
    >
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }, isCompleted && styles.completed]} numberOfLines={1}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {task.deadline ? (
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {formatRelativeDay(task.deadline)} {formatTime(task.deadline, false)}
            </Text>
          ) : null}
          {hasTimer ? (
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={12} color={colors.accentPrimary} />
              <Text style={[styles.timerText, { color: colors.accentPrimary }]}>
                {formatDuration(task.time_spent_seconds ?? 0)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleComplete}
        style={[styles.checkbox, { borderColor: priorityColor }, isCompleted && { backgroundColor: priorityColor }]}
      >
        {isCompleted && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
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
