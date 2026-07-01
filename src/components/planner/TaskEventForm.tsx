import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { EventRepository, type EventRecord } from '../../database/repositories/EventRepository';
import { spacing, typography, borderRadius } from '../../theme';
import type { EventType, EventKind, RepeatRule, TaskPriority, TaskStatus } from '../../types';

export type FormType = 'task' | 'event' | 'birthday' | 'anniversary' | 'countdown';

interface TaskEventFormProps {
  editTaskId?: string;
  editEventId?: string;
  defaultType?: FormType;
}

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

const EVENT_KIND_OPTIONS: EventKind[] = ['work', 'personal', 'health', 'finance', 'other'];

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

export function TaskEventForm({ editTaskId, editEventId, defaultType = 'task' }: TaskEventFormProps) {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { loadCalendar } = useCalendarStore();

  const [type, setType] = useState<FormType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [status, setStatus] = useState<TaskStatus>('active');

  // Task deadline
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');

  // Event fields
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [location, setLocation] = useState('');
  const [guestsText, setGuestsText] = useState('');
  const [kind, setKind] = useState<EventKind>('other');

  // Shared
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  // Modals
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customValue, setCustomValue] = useState('15');
  const [customUnit, setCustomUnit] = useState<'minute' | 'hour' | 'day'>('minute');

  const isEditing = !!editTaskId || !!editEventId;

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
          setLocation(event.location ?? '');
          setGuestsText(parseGuests(event.guests));
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
          setReminderOffsets(parseOffsets(event.reminder_offsets));
          setAlarmEnabled(event.alarm_enabled === 1);
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

  const parseGuests = (raw: string | null): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      // ignore
    }
    return raw;
  };

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
      Alert.alert('Missing title', 'Please enter a title');
      return;
    }

    try {
      if (type === 'task') {
        const deadline = buildIso(dateText, timeText, '00:00');
        const repo = new TaskRepository(db);
        if (editTaskId) {
          await repo.update(editTaskId, {
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            status,
            deadline,
            reminderOffsets: reminderOffsets.length ? reminderOffsets : undefined,
            alarmEnabled,
          });
        } else {
          await repo.create({
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            status,
            deadline,
            reminderOffsets: reminderOffsets.length ? reminderOffsets : undefined,
            alarmEnabled,
            recordSource: 'manual',
          });
        }
      } else {
        const date = buildIso(startDate, allDay ? '00:00' : startTime, '00:00');
        if (!date) {
          Alert.alert('Missing date', 'Please enter a start date');
          return;
        }
        const endDateIso = buildIso(endDate, allDay ? '23:59' : endTime, allDay ? '23:59' : '23:59');
        const guests = guestsText
          .split(/,|;/)
          .map((g) => g.trim())
          .filter(Boolean);
        const repo = new EventRepository(db);
        if (editEventId) {
          await repo.update(editEventId, {
            title: title.trim(),
            description: description.trim() || undefined,
            date,
            endDate: endDateIso,
            type,
            kind: type === 'event' ? kind : 'other',
            importance: priority,
            status,
            hasReminder: reminderOffsets.length > 0,
            reminderOffsets: reminderOffsets.length ? reminderOffsets : undefined,
            allDay,
            repeatRule,
            location: location.trim() || undefined,
            guests: guests.length ? guests : undefined,
            timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            alarmEnabled,
          });
        } else {
          await repo.create({
            title: title.trim(),
            description: description.trim() || undefined,
            date,
            endDate: endDateIso,
            type,
            kind: type === 'event' ? kind : 'other',
            importance: priority,
            status,
            hasReminder: reminderOffsets.length > 0,
            reminderOffsets: reminderOffsets.length ? reminderOffsets : undefined,
            allDay,
            repeatRule,
            location: location.trim() || undefined,
            guests: guests.length ? guests : undefined,
            timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            alarmEnabled,
            recordSource: 'manual',
          });
        }
      }
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
            } else if (editEventId) {
              await new EventRepository(db).softDelete(editEventId);
            }
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
    const value = parseInt(customValue, 10);
    if (isNaN(value) || value <= 0) return;
    let minutes = value;
    if (customUnit === 'hour') minutes *= 60;
    if (customUnit === 'day') minutes *= 1440;
    setReminderOffsets((prev) => (prev.includes(minutes) ? prev : [...prev, minutes]));
    setCustomReminderOpen(false);
  };

  const reminderSummary = useMemo(() => {
    if (reminderOffsets.length === 0) return 'None';
    const sorted = [...reminderOffsets].sort((a, b) => a - b);
    if (sorted.length === 1) return formatOffset(sorted[0]);
    return `${sorted.length} reminders`;
  }, [reminderOffsets]);

  const repeatLabel = REPEAT_OPTIONS.find((r) => r.key === repeatRule)?.label ?? 'Never';

  const isTask = type === 'task';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit' : 'New'} {type === 'task' ? 'Task' : 'Event'}
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveTopText, { color: colors.accentPrimary }]}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChips}
        >
          {TYPE_OPTIONS.map((option) => {
            const selected = type === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.typeChip,
                  selected && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
                  { borderColor: colors.border },
                ]}
                onPress={() => setType(option.key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: selected ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <InputGroup label="Title">
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder={isTask ? 'e.g. Pay electricity bill' : 'e.g. Team meeting'}
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </InputGroup>

        <InputGroup label="Description">
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Add details..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </InputGroup>

        {isTask ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Deadline</Text>
            <View style={styles.row}>
              <InputGroup label="Date" style={styles.dateInput}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={dateText}
                  onChangeText={setDateText}
                />
              </InputGroup>
              <InputGroup label="Time" style={styles.timeInput}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textTertiary}
                  value={timeText}
                  onChangeText={setTimeText}
                />
              </InputGroup>
            </View>
          </>
        ) : (
          <>
            <RowToggle label="All day" value={allDay} onValueChange={setAllDay} />

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>From</Text>
            <View style={styles.row}>
              <InputGroup label="Date" style={styles.dateInput}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </InputGroup>
              {!allDay && (
                <InputGroup label="Time" style={styles.timeInput}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textTertiary}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </InputGroup>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>To</Text>
            <View style={styles.row}>
              <InputGroup label="Date" style={styles.dateInput}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </InputGroup>
              {!allDay && (
                <InputGroup label="Time" style={styles.timeInput}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textTertiary}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </InputGroup>
              )}
            </View>

            <RowButton label="Repeat" value={repeatLabel} onPress={() => setRepeatModalOpen(true)} />

            {type === 'event' && (
              <>
                <InputGroup label="Guests">
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="email@example.com, ..."
                    placeholderTextColor={colors.textTertiary}
                    value={guestsText}
                    onChangeText={setGuestsText}
                  />
                </InputGroup>

                <InputGroup label="Location">
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="e.g. Conference room"
                    placeholderTextColor={colors.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                  />
                </InputGroup>

                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.chipWrap}>
                  {EVENT_KIND_OPTIONS.map((k) => {
                    const selected = kind === k;
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[
                          styles.categoryChip,
                          selected && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setKind(k)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: selected ? colors.textInverse : colors.textSecondary },
                          ]}
                        >
                          {k.charAt(0).toUpperCase() + k.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITY_OPTIONS.map((option) => {
            const selected = priority === option.key;
            const pColor = colors.priority[option.key];
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.priorityChip,
                  selected && { backgroundColor: pColor, borderColor: pColor },
                  { borderColor: colors.border },
                ]}
                onPress={() => setPriority(option.key)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    { color: selected ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <RowButton label="Reminders" value={reminderSummary} onPress={() => setReminderModalOpen(true)} />

        <RowToggle label="Alarm reminders" value={alarmEnabled} onValueChange={setAlarmEnabled} />

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Save</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Reminder Modal */}
      <Modal visible={reminderModalOpen} transparent animationType="slide" onRequestClose={() => setReminderModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Reminders</Text>
              <TouchableOpacity onPress={() => setReminderModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Enable reminders</Text>
              <Switch
                value={reminderOffsets.length > 0}
                onValueChange={(on) => {
                  if (!on) setReminderOffsets([]);
                  else setReminderOffsets([10]);
                }}
                trackColor={{ false: colors.border, true: colors.accentPrimary }}
                thumbColor={reminderOffsets.length > 0 ? colors.textInverse : colors.textTertiary}
              />
            </View>

            {reminderOffsets.length > 0 && (
              <>
                {REMINDER_PRESETS.map((preset) => {
                  const selected = reminderOffsets.includes(preset.minutes);
                  return (
                    <TouchableOpacity
                      key={preset.minutes}
                      style={styles.modalOption}
                      onPress={() => toggleReminder(preset.minutes)}
                    >
                      <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>{preset.label}</Text>
                      {selected && <Ionicons name="checkmark" size={20} color={colors.accentPrimary} />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.modalOption} onPress={() => setCustomReminderOpen(true)}>
                  <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>Custom...</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Reminder Modal */}
      <Modal visible={customReminderOpen} transparent animationType="slide" onRequestClose={() => setCustomReminderOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
              Custom reminder
            </Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgElevated }]}
                value={customValue}
                onChangeText={setCustomValue}
                keyboardType="number-pad"
                placeholder="15"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={styles.unitSelector}>
                {(['minute', 'hour', 'day'] as const).map((unit) => {
                  const selected = customUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        selected && { backgroundColor: colors.accentPrimary },
                        { backgroundColor: colors.bgElevated },
                      ]}
                      onPress={() => setCustomUnit(unit)}
                    >
                      <Text style={{ color: selected ? colors.textInverse : colors.textSecondary }}>
                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCustomReminderOpen(false)}>
                <Text style={[styles.modalActionText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addCustomReminder}>
                <Text style={[styles.modalActionText, { color: colors.accentPrimary }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Repeat Modal */}
      <Modal visible={repeatModalOpen} transparent animationType="slide" onRequestClose={() => setRepeatModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Repeat</Text>
              <TouchableOpacity onPress={() => setRepeatModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {REPEAT_OPTIONS.map((option) => {
              const selected = repeatRule === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.modalOption}
                  onPress={() => {
                    setRepeatRule(option.key);
                    setRepeatModalOpen(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>{option.label}</Text>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.accentPrimary} />}
                </TouchableOpacity>
              );
            })}
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
  const colors = useThemeColors();
  return (
    <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }, style]}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function RowButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      style={[styles.rowButton, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Text style={[styles.rowButtonLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.rowButtonValue}>
        <Text style={[styles.rowButtonValueText, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
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
  const colors = useThemeColors();
  return (
    <View style={[styles.rowButton, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <Text style={[styles.rowButtonLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accentPrimary }}
        thumbColor={value ? colors.textInverse : colors.textTertiary}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  saveTopText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  typeChips: {
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  typeChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  inputGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  inputLabel: {
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
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  categoryChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
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
  rowButtonLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  rowButtonValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowButtonValueText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginRight: spacing.sm,
    maxWidth: 160,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalLabel: {
    fontSize: typography.sizes.base,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalOptionText: {
    fontSize: typography.sizes.base,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    fontSize: typography.sizes.base,
  },
  unitSelector: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unitButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  modalActionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
