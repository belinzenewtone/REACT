import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Switch,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useCalendarStore } from '../../store';
import { useAppStore } from '../../store';
import {
  syncTaskReminders,
  syncEventReminders,
} from '../../services/notificationSyncService';
import {
  cancelTaskReminders,
  cancelEventReminders,
} from '../../services/notificationService';
import { useDataVersion } from '../../store/dataVersion';
import { wallClockInZoneToUtcIso, deviceTimeZone } from '../../utils/tz';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { EventRepository, type EventRecord } from '../../database/repositories/EventRepository';
import { SearchField } from '../common/SearchField';
import { Dropdown } from '../common/Dropdown';
import { DateField } from '../common/DateField';
import { TimeField } from '../common/TimeField';
import { spacing, borderRadius } from '../../theme';
import type { EventType, EventKind, RepeatRule, TaskPriority, TaskStatus } from '../../types';

type FormType = 'task' | 'event' | 'birthday' | 'anniversary' | 'countdown';

interface TaskEventFormProps {
  editTaskId?: string;
  editEventId?: string;
  defaultType?: FormType;
}

const THREE_DAYS_MINUTES = 3 * 24 * 60;

const TYPE_OPTIONS: { key: FormType; label: string }[] = [
  { key: 'task', label: 'Task' },
  { key: 'event', label: 'Event' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversary' },
  { key: 'countdown', label: 'Countdown' },
];

const PRIORITY_OPTIONS: { key: TaskPriority; label: string }[] = [
  { key: 'low', label: 'Neutral' },
  { key: 'medium', label: 'Important' },
  { key: 'high', label: 'Urgent' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#7FC8F8',
  medium: '#F5CB5C',
  high: '#F2B8B5',
};

const EVENT_KIND_OPTIONS: { key: EventKind; label: string }[] = [
  { key: 'meeting', label: 'Meeting' },
  { key: 'task', label: 'Task' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'goal', label: 'Goal' },
  { key: 'other', label: 'Other' },
];
const EVENT_KIND_DROPDOWN_OPTIONS = EVENT_KIND_OPTIONS.map((option) => ({
  value: option.key,
  label: option.label,
}));

const REPEAT_OPTIONS: { key: RepeatRule; label: string }[] = [
  { key: 'none', label: 'Never' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const REMINDER_PRESETS = [
  { label: 'At time of event', minutes: 0 },
  { label: '10 minutes before', minutes: 10 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

const REMINDER_UNIT_CONFIG: Record<'minute' | 'hour' | 'day', { label: string; short: string; max: number }> = {
  minute: { label: 'Minutes', short: 'Min', max: 60 },
  hour: { label: 'Hours', short: 'Hour', max: 24 },
  day: { label: 'Days', short: 'Day', max: 30 },
};

const REMINDER_UNIT_OPTIONS = (['minute', 'hour', 'day'] as const).map((unit) => ({
  value: unit,
  label: REMINDER_UNIT_CONFIG[unit].label,
}));

const FALLBACK_TIMEZONES = [
  'UTC', 'Africa/Nairobi', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
];

function getAvailableTimezones(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone');
    }
  } catch {
    // fall through
  }
  return FALLBACK_TIMEZONES;
}

export function TaskEventForm({ editTaskId, editEventId, defaultType = 'task' }: TaskEventFormProps) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { loadCalendar } = useCalendarStore();

  const [type, setType] = useState<FormType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [status, setStatus] = useState<TaskStatus>('active');

  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');

  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [repeatEndDate, setRepeatEndDate] = useState<string>('');
  const [location, setLocation] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [kind, setKind] = useState<EventKind>('other');
  const [timeZoneId, setTimeZoneId] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const [addYear, setAddYear] = useState(true);

  const [countdownReminderTime, setCountdownReminderTime] = useState('09:00');
  const [remind3DaysBefore, setRemind3DaysBefore] = useState(false);

  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customValue, setCustomValue] = useState('15');
  const [customUnit, setCustomUnit] = useState<'minute' | 'hour' | 'day'>('minute');
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const [timezoneQuery, setTimezoneQuery] = useState('');

  const isEditing = !!editTaskId || !!editEventId;
  const isSingleDateType = type === 'birthday' || type === 'anniversary' || type === 'countdown';

  useEffect(() => {
    if (!editTaskId && !editEventId) return;

    if (editTaskId) {
      const repo = new TaskRepository(db);
      repo.findById(editTaskId).then((task) => {
        if (task) {
          setType('task');
          setTitle(task.title);
          setDescription(task.description ?? '');
          setPriority(task.priority);
          setStatus(task.status);
          if (task.deadline) {
            const d = new Date(task.deadline);
            setDateText(d.toISOString().split('T')[0]);
            setTimeText(d.toISOString().slice(11, 16));
          }
          setReminderOffsets(parseOffsets(task.reminder_offsets));
          setAlarmEnabled(task.alarm_enabled === 1);
        }
      });
    } else if (editEventId) {
      const repo = new EventRepository(db);
      repo.findById(editEventId).then((event) => {
        if (event) {
          setType(event.type);
          setTitle(event.title);
          setDescription(event.description ?? '');
          setPriority(event.importance);
          setStatus(event.status);
          setAllDay(event.all_day === 1);
          setKind(event.kind);
          setRepeatRule(event.repeat_rule);
          setRepeatEndDate(event.repeat_end_date ? event.repeat_end_date.split('T')[0] : '');
          setLocation(event.location ?? '');
          setGuests(parseGuests(event.guests));
          setTimeZoneId(event.time_zone_id);
          if (event.date) {
            const d = new Date(event.date);
            setStartDate(d.toISOString().split('T')[0]);
            setStartTime(d.toISOString().slice(11, 16));
          }
          if (event.end_date) {
            const d = new Date(event.end_date);
            setEndDate(d.toISOString().split('T')[0]);
            setEndTime(d.toISOString().slice(11, 16));
          }
          const offsets = parseOffsets(event.reminder_offsets);
          setReminderOffsets(offsets);
          setAlarmEnabled(event.alarm_enabled === 1);
          setAddYear(event.repeat_rule === 'yearly');
          setRemind3DaysBefore(offsets.includes(THREE_DAYS_MINUTES));
          if (event.reminder_time_of_day_minutes != null) {
            const h = Math.floor(event.reminder_time_of_day_minutes / 60);
            const m = event.reminder_time_of_day_minutes % 60;
            setCountdownReminderTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
        }
      });
    }
  }, [editTaskId, editEventId, db]);

  const parseOffsets = (raw: string | null): number[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((n) => typeof n === 'number');
    } catch {
      // ignore
    }
    return [];
  };

  const parseGuests = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
    return [];
  };

  const buildIso = (date: string, time: string, defaultTime: string): string | undefined => {
    if (!date.trim()) return undefined;
    const t = time.trim() || defaultTime;
    const dParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    const tParts = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!dParts || !tParts) return undefined;
    const y  = parseInt(dParts[1], 10);
    const mo = parseInt(dParts[2], 10);
    const d  = parseInt(dParts[3], 10);
    const h  = parseInt(tParts[1], 10);
    const mi = parseInt(tParts[2], 10);
    const zone = timeZoneId?.trim() || deviceTimeZone();
    const iso = wallClockInZoneToUtcIso(y, mo, d, h, mi, zone);
    return isNaN(new Date(iso).getTime()) ? undefined : iso;
  };

  const parseTimeOfDayMinutes = (time: string): number | undefined => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return undefined;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title');
      return;
    }

    try {
      if (type === 'task') {
        const deadline = buildIso(dateText, timeText, '00:00');
        const repo = new TaskRepository(db);
        const data = {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          deadline,
          reminderOffsets: reminderOffsets.length ? reminderOffsets : undefined,
          alarmEnabled,
        };
        if (editTaskId) {
          await repo.update(editTaskId, data);
          await syncTaskReminders(db, editTaskId);
        } else {
          const created = await repo.create({ ...data, recordSource: 'manual' });
          await syncTaskReminders(db, created.id);
        }
      } else {
        let date: string | undefined;
        let endDateIso: string | undefined;
        let effectiveRepeatRule = repeatRule;
        let effectiveOffsets = reminderOffsets;
        let effectiveReminderTimeMinutes: number | undefined;
        let effectiveGuests = guests;
        let effectiveLocation = location.trim() || undefined;
        let effectiveKind: EventKind = type === 'event' ? kind : 'other';
        let effectiveAllDay = allDay;

        if (isSingleDateType) {
          date = buildIso(startDate, '00:00', '00:00');
          effectiveAllDay = true;
          effectiveGuests = [];
          effectiveLocation = undefined;
          if (type === 'birthday') {
            effectiveRepeatRule = addYear ? 'yearly' : 'none';
          } else if (type === 'anniversary') {
            effectiveRepeatRule = 'yearly';
          } else {
            effectiveRepeatRule = repeatRule;
            effectiveReminderTimeMinutes = parseTimeOfDayMinutes(countdownReminderTime);
            effectiveOffsets = [];
            if (remind3DaysBefore) effectiveOffsets.push(THREE_DAYS_MINUTES);
            if (effectiveReminderTimeMinutes != null) effectiveOffsets.push(0);
          }
        } else {
          date = buildIso(startDate, allDay ? '00:00' : startTime, '00:00');
          endDateIso = buildIso(endDate, allDay ? '23:59' : endTime, '23:59');
        }

        if (!date) {
          Alert.alert('Missing date', 'Please enter a date');
          return;
        }

        const repo = new EventRepository(db);
        const data = {
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          endDate: endDateIso,
          type,
          kind: effectiveKind,
          importance: priority,
          status,
          hasReminder: effectiveOffsets.length > 0 || effectiveReminderTimeMinutes != null,
          reminderOffsets: effectiveOffsets.length ? effectiveOffsets : undefined,
          reminderTimeOfDayMinutes: effectiveReminderTimeMinutes,
          allDay: effectiveAllDay,
          repeatRule: effectiveRepeatRule,
          repeatEndDate:
            effectiveRepeatRule !== 'none' && repeatEndDate.trim()
              ? buildIso(repeatEndDate, '23:59', '23:59')
              : undefined,
          location: effectiveLocation,
          guests: effectiveGuests.length ? effectiveGuests : undefined,
          timeZoneId,
          alarmEnabled: type === 'countdown' ? false : alarmEnabled,
        };

        if (editEventId) {
          await repo.update(editEventId, data);
          await syncEventReminders(db, editEventId);
        } else {
          const created = await repo.create({ ...data, recordSource: 'manual' });
          await syncEventReminders(db, created.id);
        }
      }
      useDataVersion.getState().bumpPlanner();
      await loadCalendar(db);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'task' && editTaskId) {
              await new TaskRepository(db).softDelete(editTaskId);
              await cancelTaskReminders(editTaskId);
            } else if (editEventId) {
              await new EventRepository(db).softDelete(editEventId);
              await cancelEventReminders(editEventId);
            }
            useDataVersion.getState().bumpPlanner();
            await loadCalendar(db);
            navigation.goBack();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  const toggleReminder = (minutes: number) => {
    setReminderOffsets((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]
    );
  };

  const addCustomReminder = () => {
    const raw = parseInt(customValue, 10);
    if (isNaN(raw) || raw <= 0) return;
    const value = Math.min(raw, REMINDER_UNIT_CONFIG[customUnit].max);
    let minutes = value;
    if (customUnit === 'hour') minutes *= 60;
    if (customUnit === 'day') minutes *= 1440;
    setReminderOffsets((prev) => (prev.includes(minutes) ? prev : [...prev, minutes]));
    setCustomReminderOpen(false);
  };

  const handleCustomUnitChange = (unit: 'minute' | 'hour' | 'day') => {
    setCustomUnit(unit);
    const current = parseInt(customValue, 10);
    if (!isNaN(current) && current > REMINDER_UNIT_CONFIG[unit].max) {
      setCustomValue(String(REMINDER_UNIT_CONFIG[unit].max));
    }
  };

  const handleCustomValueChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      setCustomValue('');
      return;
    }
    const clamped = Math.min(parseInt(digitsOnly, 10), REMINDER_UNIT_CONFIG[customUnit].max);
    setCustomValue(String(clamped));
  };

  const addGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    setGuests((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setGuestInput('');
  };

  const removeGuest = (guest: string) => {
    setGuests((prev) => prev.filter((g) => g !== guest));
  };

  const reminderSummary = useMemo(() => {
    if (reminderOffsets.length === 0) return 'None';
    const sorted = [...reminderOffsets].sort((a, b) => a - b);
    if (sorted.length === 1) return formatOffset(sorted[0]);
    return `${sorted.length} reminders`;
  }, [reminderOffsets]);

  const repeatLabel = REPEAT_OPTIONS.find((r) => r.key === repeatRule)?.label ?? 'Never';

  const filteredTimezones = useMemo(() => {
    const all = getAvailableTimezones();
    const q = timezoneQuery.trim().toLowerCase();
    if (!q) return all.slice(0, 100);
    return all.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 100);
  }, [timezoneQuery]);

  const isTask = type === 'task';
  const typeLabel = TYPE_OPTIONS.find((t) => t.key === type)?.label ?? 'Task';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            {isEditing ? 'Edit' : 'New'} {typeLabel}
          </Text>
          {isEditing ? (
            <IconButton
              icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
              size={22}
              onPress={handleDelete}
              style={{ margin: 0 }}
            />
          ) : (
            <Button mode="text" onPress={handleSave} textColor={theme.colors.primary}>
              Save
            </Button>
          )}
        </View>

        {/* Type chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChips}
        >
          {TYPE_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              selected={type === option.key}
              onPress={() => setType(option.key)}
              style={{ marginRight: spacing.sm }}
            >
              {option.label}
            </Chip>
          ))}
        </ScrollView>

        <TextInput
          mode="outlined"
          dense
          label={type === 'birthday' ? "Person's name" : type === 'anniversary' ? 'Anniversary name' : type === 'countdown' ? 'Event name' : 'Title'}
          style={styles.input}
          textColor={theme.colors.onSurface}
          placeholder={isTask ? 'e.g. Pay electricity bill' : 'e.g. Team meeting'}
          placeholderTextColor={theme.colors.outline}
          value={title}
          onChangeText={setTitle}
        />

        {!isSingleDateType && (
          <TextInput
            mode="outlined"
            dense
            label="Description"
            style={styles.input}
            textColor={theme.colors.onSurface}
            placeholder="Add details..."
            placeholderTextColor={theme.colors.outline}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        )}

        {isTask ? (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.lg, marginBottom: spacing.sm }}>Deadline</Text>
            <View style={styles.row}>
              <DateField label="Date" value={dateText} onChange={setDateText} style={styles.dateInput} />
              <TimeField label="Time" value={timeText} onChange={setTimeText} style={styles.timeInput} showIcon={false} />
            </View>
          </>
        ) : isSingleDateType ? (
          <>
            <DateField label="Date" value={startDate} onChange={setStartDate} />

            {type === 'birthday' && (
              <>
                <RowToggle label="Add year" value={addYear} onValueChange={setAddYear} />
                {addYear && (
                  <DateField
                    label="Repeat until (optional)"
                    value={repeatEndDate}
                    onChange={setRepeatEndDate}
                  />
                )}
              </>
            )}

            {type === 'anniversary' && (
              <DateField
                label="Repeat until (optional)"
                value={repeatEndDate}
                onChange={setRepeatEndDate}
              />
            )}

            {type === 'countdown' && (
              <>
                <RowButton label="Repeat" value={repeatLabel} onPress={() => setRepeatModalOpen(true)} />
                {repeatRule !== 'none' && (
                  <DateField
                    label="Repeat until (optional)"
                    value={repeatEndDate}
                    onChange={setRepeatEndDate}
                  />
                )}
                <TimeField
                  label="Remind me at (time)"
                  value={countdownReminderTime}
                  onChange={setCountdownReminderTime}
                />
                <RowToggle
                  label="Remind 3 days before"
                  value={remind3DaysBefore}
                  onValueChange={setRemind3DaysBefore}
                />
              </>
            )}
          </>
        ) : (
          <>
            <RowToggle label="All day" value={allDay} onValueChange={setAllDay} />

            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.lg, marginBottom: spacing.sm }}>From</Text>
            <View style={styles.row}>
              <DateField label="Date" value={startDate} onChange={setStartDate} style={styles.dateInput} />
              {!allDay && <TimeField label="Time" value={startTime} onChange={setStartTime} style={styles.timeInput} showIcon={false} />}
            </View>

            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.lg, marginBottom: spacing.sm }}>To</Text>
            <View style={styles.row}>
              <DateField label="Date" value={endDate} onChange={setEndDate} style={styles.dateInput} />
              {!allDay && <TimeField label="Time" value={endTime} onChange={setEndTime} style={styles.timeInput} showIcon={false} />}
            </View>
            {endDate.trim().length > 0 && (
              <Button
                mode="text"
                onPress={() => {
                  setEndDate('');
                  setEndTime('');
                }}
                textColor={theme.colors.error}
                style={{ alignSelf: 'flex-start', marginBottom: spacing.base, marginTop: -spacing.xs }}
              >
                Clear end date
              </Button>
            )}

            <RowButton label="Repeat" value={repeatLabel} onPress={() => setRepeatModalOpen(true)} />
            {repeatRule !== 'none' && (
              <DateField
                label="Repeat until (optional)"
                value={repeatEndDate}
                onChange={setRepeatEndDate}
              />
            )}

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                dense
                label="Guests"
                style={[styles.input, { flex: 1 }]}
                textColor={theme.colors.onSurface}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.outline}
                value={guestInput}
                onChangeText={setGuestInput}
                onSubmitEditing={addGuest}
              />
              <TouchableOpacity
                onPress={addGuest}
                activeOpacity={0.8}
                style={[
                  styles.addGuestButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
            {guests.length > 0 && (
              <View style={styles.chipWrap}>
                {guests.map((guest) => (
                  <Chip
                    key={guest}
                    onClose={() => removeGuest(guest)}
                    style={{ backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, maxWidth: 200 }}
                    textStyle={{ color: theme.colors.onSurface }}
                  >
                    {guest}
                  </Chip>
                ))}
              </View>
            )}

            <TextInput
              mode="outlined"
              dense
              label="Location"
              style={styles.input}
              textColor={theme.colors.onSurface}
              placeholder="e.g. Conference room"
              placeholderTextColor={theme.colors.outline}
              value={location}
              onChangeText={setLocation}
            />

            {!allDay && (
              <RowButton label="Time zone" value={timeZoneId} onPress={() => setTimezoneModalOpen(true)} />
            )}

            <Dropdown
              label="Category"
              value={kind}
              options={EVENT_KIND_DROPDOWN_OPTIONS}
              onChange={(v) => setKind(v as EventKind)}
            />
          </>
        )}

        {(isTask || type === 'event') && (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.lg, marginBottom: spacing.sm }}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  selected={priority === option.key}
                  onPress={() => setPriority(option.key)}
                  style={{ flex: 1 }}
                  selectedColor={PRIORITY_COLORS[option.key]}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </>
        )}

        {type !== 'countdown' && (
          <>
            <RowButton label="Reminders" value={reminderSummary} onPress={() => setReminderModalOpen(true)} />
            <RowToggle label="Alarm reminders" value={alarmEnabled} onValueChange={setAlarmEnabled} />
          </>
        )}

        {isEditing && (
          <Button
            mode="contained"
            onPress={handleSave}
            style={{ marginTop: spacing.xl }}
          >
            Save
          </Button>
        )}
      </ScrollView>

      {/* Reminder Modal */}
      <Modal visible={reminderModalOpen} transparent animationType="slide" onRequestClose={() => setReminderModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>Reminders</Text>
              <IconButton
                icon={() => <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />}
                size={24}
                onPress={() => setReminderModalOpen(false)}
                style={{ margin: 0 }}
              />
            </View>

            <View style={styles.modalRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Enable reminders</Text>
              <Switch
                value={reminderOffsets.length > 0}
                onValueChange={(on) => {
                  if (!on) setReminderOffsets([]);
                  else setReminderOffsets([10]);
                }}
                color={theme.colors.primary}
              />
            </View>

            {reminderOffsets.length > 0 && (
              <>
                {REMINDER_PRESETS.map((preset) => {
                  const selected = reminderOffsets.includes(preset.minutes);
                  return (
                    <TouchableRipple
                      key={preset.minutes}
                      onPress={() => toggleReminder(preset.minutes)}
                      rippleColor={theme.colors.primary}
                    >
                      <View style={styles.modalOption}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{preset.label}</Text>
                        {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                      </View>
                    </TouchableRipple>
                  );
                })}
                <TouchableRipple onPress={() => setCustomReminderOpen(true)} rippleColor={theme.colors.primary}>
                  <View style={styles.modalOption}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Custom...</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} />
                  </View>
                </TouchableRipple>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Reminder Modal */}
      <Modal visible={customReminderOpen} transparent animationType="slide" onRequestClose={() => setCustomReminderOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.lg }}>
              Custom reminder
            </Text>
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Value"
                style={[styles.customInput, { backgroundColor: theme.colors.surfaceVariant }]}
                textColor={theme.colors.onSurface}
                value={customValue}
                onChangeText={handleCustomValueChange}
                keyboardType="number-pad"
                placeholder="15"
                placeholderTextColor={theme.colors.outline}
                maxLength={2}
              />
              <View style={styles.customUnitDropdown}>
                <Dropdown
                  label="Unit"
                  value={customUnit}
                  options={REMINDER_UNIT_OPTIONS}
                  onChange={(value) => handleCustomUnitChange(value as 'minute' | 'hour' | 'day')}
                />
              </View>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: spacing.sm }}>
              {`Enter 1-${REMINDER_UNIT_CONFIG[customUnit].max} ${REMINDER_UNIT_CONFIG[customUnit].label.toLowerCase()}`}
            </Text>
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => setCustomReminderOpen(false)} textColor={theme.colors.onSurfaceVariant}>
                Cancel
              </Button>
              <Button mode="text" onPress={addCustomReminder} textColor={theme.colors.primary}>
                OK
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Repeat Modal */}
      <Modal visible={repeatModalOpen} transparent animationType="slide" onRequestClose={() => setRepeatModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>Repeat</Text>
              <IconButton
                icon={() => <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />}
                size={24}
                onPress={() => setRepeatModalOpen(false)}
                style={{ margin: 0 }}
              />
            </View>
            {REPEAT_OPTIONS.map((option) => {
              const selected = repeatRule === option.key;
              return (
                <TouchableRipple
                  key={option.key}
                  onPress={() => {
                    setRepeatRule(option.key);
                    setRepeatModalOpen(false);
                  }}
                  rippleColor={theme.colors.primary}
                >
                  <View style={styles.modalOption}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{option.label}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Timezone Modal */}
      <Modal visible={timezoneModalOpen} transparent animationType="slide" onRequestClose={() => setTimezoneModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, styles.timezoneModalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>Time zone</Text>
              <IconButton
                icon={() => <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />}
                size={24}
                onPress={() => setTimezoneModalOpen(false)}
                style={{ margin: 0 }}
              />
            </View>
            <SearchField value={timezoneQuery} onChangeText={setTimezoneQuery} placeholder="Search time zones…" />
            <ScrollView style={styles.timezoneList}>
              {filteredTimezones.map((tz) => {
                const selected = tz === timeZoneId;
                return (
                  <TouchableRipple
                    key={tz}
                    onPress={() => {
                      setTimeZoneId(tz);
                      setTimezoneModalOpen(false);
                      setTimezoneQuery('');
                    }}
                    rippleColor={theme.colors.primary}
                  >
                    <View style={styles.modalOption}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{tz}</Text>
                      {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                    </View>
                  </TouchableRipple>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return 'At time of event';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} before`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return `${h} hour${h === 1 ? '' : 's'} before`;
  }
  const d = Math.floor(minutes / 1440);
  return `${d} day${d === 1 ? '' : 's'} before`;
}

function InputGroup({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.inputGroup, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }, style]}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>{label}</Text>
      {children}
    </View>
  );
}

function RowButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={theme.colors.primary}
      style={[styles.rowButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
    >
      <>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
        <View style={styles.rowButtonValue}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginRight: spacing.sm }} numberOfLines={1}>
            {value}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} />
        </View>
      </>
    </TouchableRipple>
  );
}

function RowToggle({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.rowButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        color={theme.colors.primary}
      />
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
    paddingBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  typeChips: {
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  inputGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  input: {
    marginBottom: spacing.base,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  addGuestButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  rowButtonValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  timezoneModalContent: {
    maxHeight: '80%',
  },
  timezoneList: {
    marginTop: spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  customInput: {
    width: 120,
  },
  customUnitDropdown: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
});
