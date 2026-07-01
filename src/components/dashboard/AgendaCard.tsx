import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatRelativeDay, formatTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();
  const upcoming = items.slice(0, 5);

  return (
    <View>
      <SectionHeader title="Up next (7 days)" actionLabel="View all" onAction={onViewAll} />
      <GlassCard>
        {upcoming.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
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
  const colors = useThemeColors();
  const priorityColor = item.priority ? colors.priority[item.priority] : colors.accentPrimary;
  const iconName: keyof typeof Ionicons.glyphMap = item.type === 'task' ? 'checkbox-outline' : 'calendar-outline';

  return (
    <View style={styles.row}>
      <View style={[styles.indicator, { backgroundColor: priorityColor }]} />
      <Ionicons name={iconName} size={18} color={colors.textSecondary} style={styles.icon} />
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
    fontSize: typography.sizes.base,
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
