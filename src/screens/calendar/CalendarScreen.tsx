import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import {
  Card,
  Text,
  IconButton,
  TextInput,
  Checkbox,
  SegmentedButtons,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useCalendarStore, useAppStore } from '../../store';
import { useDataVersion } from '../../store/dataVersion';
import { CalendarMonthView } from '../../components/calendar/CalendarMonthView';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelEventReminders } from '../../services/notificationService';
import { EventRepository } from '../../database/repositories/EventRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';

const SUCCESS = '#7BC47B';
const WARNING = '#F5CB5C';

type Tab = 'Calendar' | 'Tasks' | 'Events';

const ADD_MENU_OPTIONS: {
  key: 'task' | 'event' | 'birthday' | 'anniversary' | 'countdown';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'task', label: 'Task', icon: 'checkbox-outline' },
  { key: 'event', label: 'Event', icon: 'calendar-outline' },
  { key: 'birthday', label: 'Birthday', icon: 'gift-outline' },
  { key: 'anniversary', label: 'Anniversary', icon: 'heart-outline' },
  { key: 'countdown', label: 'Countdown', icon: 'timer-outline' },
];

function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <TextInput
      mode="outlined"
      dense
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      style={{ backgroundColor: theme.colors.surfaceVariant }}
      left={
        <TextInput.Icon
          icon={() => <Ionicons name="search-outline" size={18} color={theme.colors.onSurfaceVariant} />}
        />
      }
      right={
        value.length > 0 ? (
          <TextInput.Icon
            icon={() => <Ionicons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />}
            onPress={() => onChangeText('')}
          />
        ) : null
      }
    />
  );
}

export function CalendarScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const [selectedTab, setSelectedTab] = useState<Tab>('Calendar');
  const handleSelectTab = (tab: Tab) => {
    animateLayout();
    setSelectedTab(tab);
  };
  const [calendarQuery, setCalendarQuery] = useState('');
  const [tasksQuery, setTasksQuery] = useState('');
  const [eventsQuery, setEventsQuery] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const {
    selectedDate,
    currentYear,
    currentMonth,
    eventsByDate,
    dayItems,
    allTasks,
    allEvents,
    setSelectedDate,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    loadCalendar,
  } = useCalendarStore();

  const calendarSwipe = useAppStore((s) => s.settings.calendarSwipe);

  const dataVersion = useDataVersion((s) => s.version);
  useEffect(() => {
    loadCalendar(db);
  }, [db, currentYear, currentMonth, selectedDate, dataVersion]);

  const selectedDateObj = new Date(selectedDate);
  const selectedDateLabel = format(selectedDateObj, 'EEEE, MMM dd');
  const headerSubtitle = format(new Date(), 'MMMM yyyy');

  const filteredDayItems = calendarQuery.trim()
    ? dayItems.filter((item) => item.title.toLowerCase().includes(calendarQuery.toLowerCase()))
    : dayItems;

  const dayItemGroups = useMemo(
    () =>
      [
        { key: 'task', label: 'Tasks', color: SUCCESS, items: filteredDayItems.filter((i) => i.type === 'task') },
        { key: 'event', label: 'Events', color: theme.colors.primary, items: filteredDayItems.filter((i) => i.type === 'event') },
        { key: 'birthday', label: 'Birthdays', color: '#EC4899', items: filteredDayItems.filter((i) => i.type === 'birthday') },
        { key: 'anniversary', label: 'Anniversaries', color: '#22C55E', items: filteredDayItems.filter((i) => i.type === 'anniversary') },
        { key: 'countdown', label: 'Countdowns', color: WARNING, items: filteredDayItems.filter((i) => i.type === 'countdown') },
      ].filter((group) => group.items.length > 0),
    [filteredDayItems, theme]
  );

  const tasks = (allTasks ?? []).filter((t: any) =>
    tasksQuery ? t.title.toLowerCase().includes(tasksQuery.toLowerCase()) : true
  );
  const pendingCount = tasks.filter((t: any) => t.status === 'active').length;
  const doingCount = 0;
  const doneCount = tasks.filter((t: any) => t.status === 'completed').length;

  const events = (allEvents ?? []).filter((e: any) => {
    if (e.type === 'birthday' || e.type === 'anniversary' || e.type === 'countdown') return false;
    return eventsQuery ? e.title.toLowerCase().includes(eventsQuery.toLowerCase()) : true;
  });

  async function handleDeleteEvent(eventId: string, title: string) {
    Alert.alert('Delete event?', `Remove "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await new EventRepository(db).softDelete(eventId);
            await cancelEventReminders(eventId);
            await loadCalendar(db);
          } catch (e) {
            console.warn('delete event error', e);
          }
        },
      },
    ]);
  }

  async function handleCompleteTask(taskId: string) {
    try {
      await new TaskRepository(db).toggleComplete(taskId);
      await syncTaskReminders(db, taskId);
      await loadCalendar(db);
    } catch (e) {
      console.warn('complete task error', e);
    }
  }

  function handleAddPress() {
    if (selectedTab === 'Tasks') {
      navigation.navigate('TaskForm');
      return;
    }
    if (selectedTab === 'Events') {
      navigation.navigate('EventForm');
      return;
    }
    setAddMenuOpen(true);
  }

  function handleAddMenuSelect(key: (typeof ADD_MENU_OPTIONS)[number]['key']) {
    setAddMenuOpen(false);
    if (key === 'task') {
      navigation.navigate('TaskForm');
    } else {
      navigation.navigate('EventForm', { type: key });
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Calendar
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {headerSubtitle}
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={24} color={theme.colors.primary} />}
            onPress={handleAddPress}
          />
        </View>

        <SegmentedButtons
          value={selectedTab}
          onValueChange={(value) => handleSelectTab(value as Tab)}
          buttons={[
            { value: 'Calendar', label: 'Calendar' },
            { value: 'Tasks', label: 'Tasks' },
            { value: 'Events', label: 'Events' },
          ]}
          style={[styles.tabBar, { backgroundColor: theme.colors.surfaceVariant }]}
        />

        {selectedTab === 'Calendar' && (
          <>
            <CalendarMonthView
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onGoToToday={goToToday}
              swipeEnabled={calendarSwipe !== false}
            />

            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.base }}>
              {selectedDateLabel}
            </Text>

            <SearchBar
              value={calendarQuery}
              onChangeText={setCalendarQuery}
              placeholder="Search across all categories"
            />

            {dayItemGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={theme.colors.outline} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Nothing for the day
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Tap + to add an event, birthday, countdown and more.
                </Text>
              </View>
            ) : (
              dayItemGroups.map((group) => (
                <View key={group.key} style={styles.dayItemGroup}>
                  <View style={styles.dayItemGroupHeader}>
                    <View style={[styles.dayItemGroupBar, { backgroundColor: group.color }]} />
                    <Text variant="labelLarge" style={{ color: group.color, flex: 1 }}>
                      {group.label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {group.items.length}
                    </Text>
                  </View>
                  {group.items.map((item: any) => (
                    <GlassCard
                      key={item.id}
                      style={styles.dayItemCard}
                      onPress={() =>
                        item.type === 'task'
                          ? navigation.navigate('TaskDetail', { taskId: item.id })
                          : navigation.navigate('EventDetail', { eventId: item.id })
                      }
                    >
                      <Card.Content style={styles.dayItemRow}>
                        <View style={[styles.dayItemDot, { backgroundColor: group.color }]} />
                        <View style={styles.dayItemInfo}>
                          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.time && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                              {item.time}
                            </Text>
                          )}
                        </View>
                      </Card.Content>
                    </GlassCard>
                  ))}
                </View>
              ))
            )}
          </>
        )}

        {selectedTab === 'Tasks' && (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {pendingCount} Pending · {doingCount} Doing · {doneCount} Done
            </Text>

            <SearchBar value={tasksQuery} onChangeText={setTasksQuery} placeholder="Search tasks..." />

            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.outline} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  No tasks here
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Use + below to create your first task.
                </Text>
              </View>
            ) : (
              tasks.map((task: any) => {
                const isDone = task.status === 'completed';
                return (
                  <GlassCard
                    key={task.id}
                    style={styles.taskCard}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  >
                    <Card.Content style={styles.taskRow}>
                      <Checkbox
                        status={isDone ? 'checked' : 'unchecked'}
                        onPress={() => handleCompleteTask(task.id)}
                        color={isDone ? SUCCESS : theme.colors.outline}
                      />
                      <View style={styles.taskInfo}>
                        <Text
                          variant="bodyLarge"
                          style={[
                            { color: theme.colors.onSurface },
                            isDone && styles.completed,
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        {task.deadline && (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                            {format(new Date(task.deadline), 'MMM dd, yyyy')}
                          </Text>
                        )}
                      </View>
                      {task.priority && (
                        <View
                          style={[
                            styles.priorityDot,
                            {
                              backgroundColor:
                                task.priority === 'high'
                                  ? theme.colors.error
                                  : task.priority === 'medium'
                                  ? WARNING
                                  : theme.colors.primary,
                            },
                          ]}
                        />
                      )}
                    </Card.Content>
                  </GlassCard>
                );
              })
            )}
          </>
        )}

        {selectedTab === 'Events' && (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </Text>

            <SearchBar value={eventsQuery} onChangeText={setEventsQuery} placeholder="Search events..." />

            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={theme.colors.outline} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Events Area
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  No events yet. Tap + to create one.
                </Text>
              </View>
            ) : (
              events.map((event: any) => (
                <GlassCard
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                  <Card.Content style={styles.eventRow}>
                    <View style={[styles.eventBar, { backgroundColor: theme.colors.primary }]} />
                    <View style={styles.eventInfo}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : ''}
                        {event.event_type ? ` · ${event.event_type}` : ''}
                      </Text>
                    </View>
                    <IconButton
                      icon={() => <Ionicons name="trash-outline" size={18} color={theme.colors.error} />}
                      size={18}
                      onPress={() => handleDeleteEvent(event.id, event.title)}
                    />
                  </Card.Content>
                </GlassCard>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={addMenuOpen} transparent animationType="slide" onRequestClose={() => setAddMenuOpen(false)}>
        <View style={[styles.addMenuOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.addMenuContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.addMenuHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                Add
              </Text>
              <IconButton
                icon={() => <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />}
                onPress={() => setAddMenuOpen(false)}
              />
            </View>
            {ADD_MENU_OPTIONS.map((option) => (
              <TouchableRipple
                key={option.key}
                onPress={() => handleAddMenuSelect(option.key)}
              >
                <View style={styles.addMenuOption}>
                  <Ionicons name={option.icon} size={20} color={theme.colors.primary} />
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    {option.label}
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  tabBar: {
    borderRadius: borderRadius.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  dayItemGroup: {
    gap: spacing.sm,
  },
  dayItemGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayItemGroupBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  dayItemCard: {
    borderRadius: 12,
  },
  dayItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayItemInfo: {
    flex: 1,
  },
  taskCard: {
    borderRadius: 12,
    marginBottom: 0,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventCard: {
    borderRadius: 12,
    marginBottom: 0,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eventBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  eventInfo: {
    flex: 1,
  },
  addMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addMenuContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.base,
  },
  addMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
});
