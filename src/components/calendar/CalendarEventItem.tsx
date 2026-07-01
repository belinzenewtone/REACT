import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDateTime, formatRelativeDay } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import type { EventRecord } from '../../database/repositories/EventRepository';

interface CalendarEventItemProps {
  event: EventRecord;
  onPress: () => void;
}

export function CalendarEventItem({ event, onPress }: CalendarEventItemProps) {
  const colors = useThemeColors();
  const priorityColor = colors.priority[event.importance];
  const iconName: keyof typeof Ionicons.glyphMap = event.type === 'event' ? 'calendar' : 'gift';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
    >
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <View style={[styles.iconCircle, { backgroundColor: `${priorityColor}20` }]}>
        <Ionicons name={iconName} size={18} color={priorityColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {formatRelativeDay(event.date)} · {formatDateTime(event.date, { dateFormat: 'MMM d', use24h: false })}
        </Text>
        {event.location ? (
          <Text style={[styles.location, { color: colors.textTertiary }]} numberOfLines={1}>
            {event.location}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.base,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  meta: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  location: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
