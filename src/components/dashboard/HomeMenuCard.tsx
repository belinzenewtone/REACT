import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();

  const handlers: Record<string, (() => void) | undefined> = {
    tasks: onTasksPress,
    nextEvent: onNextEventPress,
    insights: onInsightsPress,
    search: onSearchPress,
  };

  return (
    <GlassCard>
      {MENU_ITEMS.map((item, index) => {
        const props = { pendingTaskCount, nextEvent };
        const value = item.value(props);
        const isLast = index === MENU_ITEMS.length - 1;

        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.row, !isLast && { marginBottom: spacing.base }]}
            onPress={handlers[item.key]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${colors.accentPrimary}20` }]}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.accentPrimary} />
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{item.label}</Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {value}
              </Text>
              {item.key === 'nextEvent' && nextEvent ? (
                <Text style={[styles.subvalue, { color: colors.textTertiary }]}>
                  {formatDateTime(nextEvent.date, { dateFormat: 'MMM d', use24h: false })}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={styles.chevron} />
          </TouchableOpacity>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  value: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  subvalue: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
