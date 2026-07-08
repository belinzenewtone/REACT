import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, Chip, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';

type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.6',
    date: '2026-05',
    title: 'Profile & settings redesign',
    highlights: [
      'RN-style profile hero card with avatar, name, workspace, member since',
      'Tool Hub 3×2 grid with Analytics, Review, Search, Recurring, Export, Assistant',
      'Settings grouped cards with icon + title + subtitle + toggle/chevron pattern',
      'Search smooth transitions (no more flashing)',
      'Improved theme picker with pill segmented control',
    ],
  },
  {
    version: '1.4.2',
    date: '2026-05',
    title: 'Search data fix & profile grid redesign',
    highlights: [
      'Search now queries all data including unclaimed records',
      'Added deleted_at IS NULL filter to all search queries',
      'Profile grid redesigned — icon above title, tap any card to open its page',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05',
    title: 'UI overhaul — Nexus Blue, pill shapes, unified shadows',
    highlights: [
      'Nexus Blue #2E6FE8 palette applied across light/dark themes',
      'Bottom nav labels always visible with smooth color animation',
      'Real-time search with source icons and cleaner layout',
      'Unified design tokens for cards, inputs, buttons, dialogs',
    ],
  },
  {
    version: '1.3.4',
    date: '2026-05',
    title: 'Stable baseline',
    highlights: [
      'Task management with categories, priorities, deadlines',
      'Finance tracking with M-Pesa integration',
      'Calendar events and recurring templates',
      'AI assistant for quick task creation',
      'Offline-first with cloud sync',
    ],
  },
];

export function ChangelogScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <View style={styles.headerCenter}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>PersonalOS</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>What's new</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>
          Recent updates and improvements.
        </Text>

        {CHANGELOG.map((entry, index) => (
          <GlassCard key={entry.version} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text
                variant="bodyMedium"
                style={{ color: index === 0 ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: '600' }}
              >
                v{entry.version}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{entry.date}</Text>
              {index === 0 && (
                <Chip
                  style={{ backgroundColor: `${theme.colors.primary}20` }}
                  textStyle={{ color: theme.colors.primary }}
                >
                  Latest
                </Chip>
              )}
            </View>

            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>
              {entry.title}
            </Text>

            <View style={styles.highlights}>
              {entry.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} style={styles.highlightIcon} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{h}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  highlights: { gap: spacing.sm },
  highlightRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  highlightIcon: { marginTop: 2, flexShrink: 0 },
});
