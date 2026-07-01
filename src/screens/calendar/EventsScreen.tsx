import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, typography, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';

export function EventsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { allEvents, loadCalendar } = useCalendarStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadCalendar(db);
  }, [db, loadCalendar]);

  const events = useMemo(() => {
    const now = new Date();
    const upcoming = (allEvents ?? []).filter((e: any) => !e.date || new Date(e.date) >= now);
    const filtered = query.trim()
      ? upcoming.filter((e: any) => e.title.toLowerCase().includes(query.toLowerCase()))
      : upcoming;
    return filtered.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  }, [allEvents, query]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Events</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Upcoming</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('EventForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search events..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No upcoming events</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Tap + to schedule your next event.
            </Text>
          </View>
        ) : (
          events.map((event: any) => (
            <GlassCard key={event.id} style={styles.eventCard}>
              <TouchableOpacity
                style={styles.eventRow}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              >
                <View style={[styles.eventBar, { backgroundColor: colors.accentPrimary }]} />
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventDate, { color: colors.textSecondary }]}>
                    {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : ''}
                    {event.event_type ? ` · ${event.event_type}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
  },
  emptyState: {
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  emptyDesc: {
    fontSize: typography.sizes.base,
  },
  eventCard: { marginBottom: 0 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventBar: { width: 3, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  eventDate: { fontSize: typography.sizes.xs, marginTop: 2 },
});
