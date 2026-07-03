import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDate, formatTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export interface DayEvent {
  id: string;
  title: string;
  date: string;
  type: 'event' | 'task' | 'birthday' | 'anniversary' | 'countdown';
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  location?: string | null;
  allDay?: boolean;
  /** Non-zero when this is a synthetic occurrence of a repeating series. */
  occurrenceIndex?: number;
  /** Number of days between selected date and the event's actual date (countdown ordinal). */
  daysToGo?: number;
}

interface DayAgendaProps {
  selectedDate: string;
  items: DayEvent[];
  onAddEvent?: () => void;
  onAddTask?: () => void;
  onItemPress?: (item: DayEvent) => void;
}

export function DayAgenda({
  selectedDate,
  items,
  onAddEvent,
  onAddTask,
  onItemPress,
}: DayAgendaProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.dateTitle, { color: colors.textPrimary }]}>
          {formatDate(selectedDate, 'EEEE, dd MMM')}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onAddEvent} style={[styles.iconButton, { backgroundColor: colors.glassWhite }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accentPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddTask} style={[styles.iconButton, { backgroundColor: colors.glassWhite }]}>
            <Ionicons name="checkbox-outline" size={18} color={colors.success} />
          </TouchableOpacity>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No events or tasks for this day
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <AgendaItemRow key={item.id} item={item} onPress={() => onItemPress?.(item)} />
        ))
      )}
    </View>
  );
}

function AgendaItemRow({ item, onPress }: { item: DayEvent; onPress?: () => void }) {
  const colors = useThemeColors();
  const priorityColor = item.priority ? colors.priority[item.priority] : colors.accentPrimary;
  const iconName: keyof typeof Ionicons.glyphMap = item.type === 'task' ? 'checkbox-outline' : 'calendar-outline';

  return (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <Ionicons name={iconName} size={18} color={priorityColor} style={styles.icon} />
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
            item.completed && styles.completed,
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {formatTime(item.date)} {item.location ? `· ${item.location}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  dateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  indicator: {
    width: 3,
    height: 36,
    borderRadius: borderRadius.full,
    marginRight: spacing.base,
  },
  icon: {
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  meta: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
