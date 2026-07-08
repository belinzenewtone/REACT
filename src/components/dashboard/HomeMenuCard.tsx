import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { FrostCard } from '../common/FrostCard';
import { formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

interface HomeMenuCardProps {
  pendingTaskCount: number;
  nextEvent?: { title: string; date: string } | null;
  onTasksPress?: () => void;
  onNextEventPress?: () => void;
  onInsightsPress?: () => void;
  onSearchPress?: () => void;
}

const MENU_ITEMS = [
  { key: 'tasks', icon: 'checkmark-circle', label: 'Tasks', value: (p: HomeMenuCardProps) => `${p.pendingTaskCount} pending` },
  { key: 'nextEvent', icon: 'calendar', label: 'Next Event', value: (p: HomeMenuCardProps) => p.nextEvent?.title ?? 'No event' },
  { key: 'insights', icon: 'analytics', label: 'Analytics', value: () => 'Trends' },
  { key: 'search', icon: 'search', label: 'Search', value: () => 'Explore' },
] as const;

export function HomeMenuCard({
  pendingTaskCount,
  nextEvent,
  onTasksPress,
  onNextEventPress,
  onInsightsPress,
  onSearchPress,
}: HomeMenuCardProps) {
  const theme = useTheme();

  const handlers: Record<string, (() => void) | undefined> = {
    tasks: onTasksPress,
    nextEvent: onNextEventPress,
    insights: onInsightsPress,
    search: onSearchPress,
  };

  return (
    <FrostCard glow="none" contentStyle={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.base }}>
      <>
        {MENU_ITEMS.map((item, index) => {
          const props = { pendingTaskCount, nextEvent };
          const value = item.value(props);
          const isLast = index === MENU_ITEMS.length - 1;

          return (
            <TouchableRipple
              key={item.key}
              onPress={handlers[item.key]}
              style={[styles.row, !isLast && { marginBottom: spacing.base }]}
            >
              <>
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.primary} />
                </View>
                <Text variant="bodyLarge" style={[styles.label, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {item.label}
                </Text>
                <View style={styles.valueContainer}>
                  <Text variant="bodyMedium" style={[styles.value, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {value}
                  </Text>
                  {item.key === 'nextEvent' && nextEvent ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }} numberOfLines={1}>
                      {formatDateTime(nextEvent.date, { dateFormat: 'MMM d', use24h: false })}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} style={styles.chevron} />
              </>
            </TouchableRipple>
          );
        })}
      </>
    </FrostCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  label: {
    flexShrink: 0,
    marginRight: spacing.sm,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  value: {
    fontWeight: '500',
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
