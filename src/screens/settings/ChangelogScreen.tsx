import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
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
  const colors = useThemeColors();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>PersonalOS</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>What's new</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Recent updates and improvements.
        </Text>

        {CHANGELOG.map((entry, index) => (
          <GlassCard key={entry.version} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.versionBadge,
                  { color: index === 0 ? colors.accentPrimary : colors.textSecondary },
                ]}
              >
                v{entry.version}
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{entry.date}</Text>
              {index === 0 && (
                <View style={[styles.latestBadge, { backgroundColor: `${colors.accentPrimary}20` }]}>
                  <Text style={[styles.latestText, { color: colors.accentPrimary }]}>Latest</Text>
                </View>
              )}
            </View>

            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{entry.title}</Text>

            <View style={styles.highlights}>
              {entry.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.accentPrimary} style={styles.highlightIcon} />
                  <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{h}</Text>
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
  eyebrow: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm, marginBottom: spacing.base },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  versionBadge: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  date: { flex: 1, fontSize: typography.sizes.sm },
  latestBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  latestText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  cardTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  highlights: { gap: spacing.sm },
  highlightRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  highlightIcon: { marginTop: 2, flexShrink: 0 },
  highlightText: { flex: 1, fontSize: typography.sizes.base, lineHeight: typography.sizes.base * 1.5 },
});
