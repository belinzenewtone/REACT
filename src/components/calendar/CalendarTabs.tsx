import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

export type CalendarTabKey = 'calendar' | 'tasks' | 'events';

const TABS: { key: CalendarTabKey; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'events', label: 'Events' },
];

interface CalendarTabsProps {
  active: CalendarTabKey;
  onChange: (tab: CalendarTabKey) => void;
}

export function CalendarTabs({ active, onChange }: CalendarTabsProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.8}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              isActive && { backgroundColor: colors.accentPrimary },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
