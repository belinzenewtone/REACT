import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { formatRelativeDay, formatTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

export interface AgendaItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  dueDate: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface AgendaCardProps {
  items: AgendaItem[];
  onViewAll?: () => void;
}

export function AgendaCard({ items, onViewAll }: AgendaCardProps) {
  const upcoming = items.slice(0, 5);

  return (
    <View>
      <SectionHeader title="Up next (7 days)" actionLabel="View all" onAction={onViewAll} />
      <GlassCard>
        {upcoming.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            Nothing scheduled for the next 7 days
          </Text>
        ) : (
          upcoming.map((item) => <AgendaRow key={item.id} item={item} />)
        )}
      </GlassCard>
    </View>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const theme = useTheme();

  let priorityColor = theme.colors.primary;
  if (item.priority === 'high') priorityColor = theme.colors.error;
  else if (item.priority === 'medium') priorityColor = theme.colors.tertiary;
  else if (item.priority === 'low') priorityColor = theme.colors.primary;

  const iconName: keyof typeof Ionicons.glyphMap = item.type === 'task' ? 'checkbox-outline' : 'calendar-outline';

  return (
    <View style={styles.row}>
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <Ionicons name={iconName} size={18} color={theme.colors.onSurfaceVariant} style={styles.icon} />
      <View style={styles.content}>
        <Text
          variant="bodyMedium"
          style={[
            { color: theme.colors.onSurface },
            item.completed && styles.completed,
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {formatRelativeDay(item.dueDate)} · {formatTime(item.dueDate)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
