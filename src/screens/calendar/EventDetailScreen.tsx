import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { EventRepository, type EventRecord } from '../../database/repositories/EventRepository';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { cancelEventReminders } from '../../services/notificationService';
import { haptic } from '../../services/haptics';
import { useDataVersion } from '../../store/dataVersion';
import type { RootStackParamList } from '../../navigation/types';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

export function EventDetailScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailRouteProp>();
  const { loadCalendar } = useCalendarStore();

  const eventId = route.params.eventId;
  const [event, setEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    const repo = new EventRepository(db);
    repo.findById(eventId).then(setEvent);
  }, [db, eventId]);

  const handleDelete = () => {
    Alert.alert('Delete event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new EventRepository(db);
          await repo.softDelete(eventId);
          await cancelEventReminders(eventId);
          useDataVersion.getState().bump();
          await loadCalendar(db);
          haptic('warning');
          navigation.goBack();
        },
      },
    ]);
  };

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = colors.priority[event.importance];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Event</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {event.importance.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={3}>{event.title}</Text>
          <Text style={[styles.typeText, { color: colors.textSecondary }]}>
            {event.type} · {event.kind}
          </Text>
          {event.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>
          ) : null}
        </View>

        <DetailRow label="Starts" value={formatDateTime(event.date)} />
        {event.end_date ? <DetailRow label="Ends" value={formatDateTime(event.end_date)} /> : null}
        {event.location ? <DetailRow label="Location" value={event.location} /> : null}
        <DetailRow label="Status" value={event.status} />
        <DetailRow label="Repeat" value={event.repeat_rule} />
        {event.all_day === 1 ? <DetailRow label="All day" value="Yes" /> : null}

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.accentPrimary }]}
          onPress={() => navigation.navigate('EventForm', { eventId })}
        >
          <Text style={[styles.editButtonText, { color: colors.textInverse }]} numberOfLines={1}>Edit Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
  },
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  priorityBadge: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.base,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  eventTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  typeText: {
    fontSize: typography.sizes.sm,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  description: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
  },
  rowValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.base,
    textTransform: 'capitalize',
  },
  editButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
