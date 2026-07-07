import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, Chip, Button, IconButton, useTheme } from 'react-native-paper';
import { useCalendarStore } from '../../store';
import { EventRepository, type EventRecord } from '../../database/repositories/EventRepository';
import { formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { cancelEventReminders } from '../../services/notificationService';
import { haptic } from '../../services/haptics';
import { useDataVersion } from '../../store/dataVersion';
import type { RootStackParamList } from '../../navigation/types';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

const PRIORITY_COLORS: Record<string, string> = {
  low: '#7FC8F8',
  medium: '#F5CB5C',
  high: '#F2B8B5',
};

export function EventDetailScreen() {
  const theme = useTheme();
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = PRIORITY_COLORS[event.importance] ?? theme.colors.onSurfaceVariant;

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
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Event</Text>
          <IconButton
            icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
            size={22}
            onPress={handleDelete}
            style={{ margin: 0 }}
          />
        </View>

        <GlassCard style={{ borderRadius: borderRadius['2xl'], marginBottom: spacing.xl }}>
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <Chip
            style={{ backgroundColor: `${priorityColor}20`, marginBottom: spacing.base }}
            textStyle={{ color: priorityColor }}
          >
            {event.importance.toUpperCase()}
          </Chip>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }} numberOfLines={3}>
            {event.title}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize', marginTop: 4 }}>
            {event.type} · {event.kind}
          </Text>
          {event.description ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.base }}>
              {event.description}
            </Text>
          ) : null}
          </View>
        </GlassCard>

        <DetailRow label="Starts" value={formatDateTime(event.date)} />
        {event.end_date ? <DetailRow label="Ends" value={formatDateTime(event.end_date)} /> : null}
        {event.location ? <DetailRow label="Location" value={event.location} /> : null}
        <DetailRow label="Status" value={event.status} />
        <DetailRow label="Repeat" value={event.repeat_rule} />
        {event.all_day === 1 ? <DetailRow label="All day" value="Yes" /> : null}

        <Button
          mode="contained"
          onPress={() => navigation.navigate('EventForm', { eventId })}
          style={{ marginTop: spacing.xl }}
        >
          Edit Event
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: 'right', flex: 1, marginLeft: spacing.base, textTransform: 'capitalize' }}>
        {value}
      </Text>
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
});
