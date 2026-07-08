import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { format } from 'date-fns';
import { Text, Searchbar, IconButton, useTheme } from 'react-native-paper';
import { useCalendarStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

export function EventsScreen() {
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Events</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Upcoming</Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={24} color={theme.colors.primary} />}
            size={24}
            onPress={() => navigation.navigate('EventForm')}
            style={{ margin: 0 }}
          />
        </View>

        <Searchbar
          placeholder="Search events..."
          onChangeText={setQuery}
          value={query}
          style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.outline}
        />

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>No upcoming events</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Tap + to schedule your next event.
            </Text>
          </View>
        ) : (
          events.map((event: any) => (
            <GlassCard
              key={event.id}
              style={styles.eventCard}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            >
              <View style={styles.eventRow}>
                <View style={[styles.eventBar, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.eventInfo}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : ''}
                    {event.event_type ? ` · ${event.event_type}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} />
              </View>
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  emptyState: {
    gap: spacing.sm,
  },
  eventCard: { marginBottom: 0 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  eventBar: { width: 3, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
});
