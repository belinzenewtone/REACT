import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { EventRepository } from '../../database/repositories/EventRepository';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { EventType, EventKind, TaskPriority, TaskStatus, RepeatRule } from '../../types';

type EventFormRouteProp = RouteProp<RootStackParamList, 'EventForm'>;

const TYPES: EventType[] = ['event', 'birthday', 'anniversary', 'countdown'];
const KINDS: EventKind[] = ['meeting', 'reminder', 'task', 'goal', 'other'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const STATUSES: TaskStatus[] = ['active', 'completed'];
const REPEAT_RULES: RepeatRule[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export function EventFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<EventFormRouteProp>();
  const { loadCalendar } = useCalendarStore();

  const eventId = route.params?.eventId;
  const isEditing = !!eventId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<EventType>('event');
  const [kind, setKind] = useState<EventKind>('other');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const repo = new EventRepository(db);
    repo.findById(eventId).then((event) => {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? '');
        setLocation(event.location ?? '');
        setType(event.type);
        setKind(event.kind);
        setPriority(event.importance);
        setStatus(event.status);
        setAllDay(event.all_day === 1);
        setRepeatRule(event.repeat_rule);
        const parseDateTime = (iso?: string | null) => {
          if (!iso) return { date: '', time: '' };
          const d = new Date(iso);
          return { date: d.toISOString().split('T')[0], time: d.toISOString().slice(11, 16) };
        };
        const start = parseDateTime(event.date);
        setStartDate(start.date);
        setStartTime(start.time);
        const end = parseDateTime(event.end_date);
        setEndDate(end.date);
        setEndTime(end.time);
      }
    });
  }, [eventId, db]);

  const buildIso = (date: string, time: string, defaultTime: string): string | undefined => {
    if (!date.trim()) return undefined;
    const t = time.trim() || defaultTime;
    const iso = `${date}T${t}:00.000Z`;
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Missing start date', 'Please enter a start date');
      return;
    }

    const date = buildIso(startDate, startTime, '00:00');
    const endDateIso = buildIso(endDate, endTime, '23:59');
    if (!date) {
      Alert.alert('Invalid date/time', 'Check the start date and time format');
      return;
    }

    const repo = new EventRepository(db);

    try {
      if (isEditing && eventId) {
        await repo.update(eventId, {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          date,
          endDate: endDateIso,
          type,
          kind,
          importance: priority,
          status,
          allDay,
          repeatRule,
        });
      } else {
        await repo.create({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          date,
          endDate: endDateIso,
          type,
          kind,
          importance: priority,
          status,
          hasReminder: false,
          allDay,
          repeatRule,
          timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          alarmEnabled: false,
          recordSource: 'manual',
        });
      }
      await loadCalendar(db);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handleDelete = () => {
    if (!eventId) return;
    Alert.alert('Delete event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new EventRepository(db);
          await repo.softDelete(eventId);
          await loadCalendar(db);
          navigation.goBack();
        },
      },
    ]);
  };

  const renderSegment = <T extends string>(
    options: readonly T[],
    selected: T,
    onSelect: (value: T) => void
  ) => (
    <View style={styles.segmentContainer}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segment, isSelected && { backgroundColor: colors.accentPrimary }]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.segmentText, { color: isSelected ? colors.textInverse : colors.textSecondary }]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Event' : 'Add Event'}
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="e.g. Team meeting"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Notes..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Location (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="e.g. Conference room"
            placeholderTextColor={colors.textTertiary}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Start</Text>
        <View style={styles.row}>
          <View style={[styles.dateInput, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={[styles.timeInput, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="HH:MM"
              placeholderTextColor={colors.textTertiary}
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>End (optional)</Text>
        <View style={styles.row}>
          <View style={[styles.dateInput, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
          <View style={[styles.timeInput, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="HH:MM"
              placeholderTextColor={colors.textTertiary}
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.allDayButton, { backgroundColor: allDay ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setAllDay((v) => !v)}
        >
          <Text style={{ color: allDay ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            All day: {allDay ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Type</Text>
        {renderSegment(TYPES, type, setType)}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Kind</Text>
        {renderSegment(KINDS, kind, setKind)}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Priority</Text>
        {renderSegment(PRIORITIES, priority, setPriority)}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
        {renderSegment(STATUSES, status, setStatus)}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Repeat</Text>
        {renderSegment(REPEAT_RULES, repeatRule, setRepeatRule)}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isEditing ? 'Update Event' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.lg,
  },
  inputGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  input: {
    fontSize: typography.sizes.base,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  dateInput: {
    flex: 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  timeInput: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  allDayButton: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segmentText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
