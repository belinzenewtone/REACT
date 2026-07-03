import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore, useAppStore } from '../../store';
import { useDataVersion } from '../../store/dataVersion';
import { CalendarMonthView } from '../../components/calendar/CalendarMonthView';
import { spacing, typography, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelEventReminders } from '../../services/notificationService';
import { EventRepository } from '../../database/repositories/EventRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';

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

function PillTabBar({ selected, onSelect, colors }: { selected: Tab; onSelect: (t: Tab) => void; colors: any }) {
  const tabs: Tab[] = ['Calendar', 'Tasks', 'Events'];
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.bgTertiary }]}>
      {tabs.map((tab) => {
        const active = tab === selected;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, active && { backgroundColor: colors.accentPrimary }]}
            onPress={() => onSelect(tab)}
          >
            <Text style={[styles.tabText, { color: active ? colors.textInverse : colors.textSecondary }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SearchBar({ value, onChangeText, placeholder, colors }: { value: string; onChangeText: (v: string) => void; placeholder: string; colors: any }) {
  return (
    <View style={[styles.searchBar, { backgroundColor: colors.bgTertiary }]}>
      <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function CalendarScreen() {
  const colors = useThemeColors();
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
    isLoading,
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

  // Missing key on already-persisted stores means undefined → treated as ON.
  const calendarSwipe = useAppStore((s) => s.settings.calendarSwipe);

  const dataVersion = useDataVersion((s) => s.version);
  useEffect(() => {
    loadCalendar(db);
  }, [db, currentYear, currentMonth, selectedDate, dataVersion]);

  const selectedDateObj = new Date(selectedDate);
  const selectedDateLabel = format(selectedDateObj, 'EEEE, MMM dd');
  const headerSubtitle = format(new Date(), 'MMMM yyyy');

  // Calendar tab: filter day items by query
  const filteredDayItems = calendarQuery.trim()
    ? dayItems.filter((item) => item.title.toLowerCase().includes(calendarQuery.toLowerCase()))
    : dayItems;

  const dayItemGroups: { key: string; label: string; color: string; items: typeof filteredDayItems }[] = [
    { key: 'task', label: 'Tasks', color: colors.accentSecondary, items: filteredDayItems.filter((i) => i.type === 'task') },
    { key: 'event', label: 'Events', color: colors.accentPrimary, items: filteredDayItems.filter((i) => i.type === 'event') },
    { key: 'birthday', label: 'Birthdays', color: colors.category.entertainment, items: filteredDayItems.filter((i) => i.type === 'birthday') },
    { key: 'anniversary', label: 'Anniversaries', color: colors.category.savings, items: filteredDayItems.filter((i) => i.type === 'anniversary') },
    { key: 'countdown', label: 'Countdowns', color: colors.warning, items: filteredDayItems.filter((i) => i.type === 'countdown') },
  ].filter((group) => group.items.length > 0);

  // Tasks tab
  const tasks = (allTasks ?? []).filter((t: any) =>
    tasksQuery ? t.title.toLowerCase().includes(tasksQuery.toLowerCase()) : true
  );
  const pendingCount = tasks.filter((t: any) => t.status === 'active').length;
  const doingCount = 0;
  const doneCount = tasks.filter((t: any) => t.status === 'completed').length;

  // Events tab — regular events only (not birthday/anniversary/countdown)
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadCalendar(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{headerSubtitle}</Text>
          </View>
          <TouchableOpacity onPress={handleAddPress}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        {/* Pill tab bar */}
        <View style={styles.tabBarWrapper}>
          <PillTabBar selected={selectedTab} onSelect={handleSelectTab} colors={colors} />
        </View>

        {/* ─── Calendar Tab ─── */}
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

            <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>{selectedDateLabel}</Text>

            <SearchBar
              value={calendarQuery}
              onChangeText={setCalendarQuery}
              placeholder="Search across all categories"
              colors={colors}
            />

            {dayItemGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nothing for the day</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Tap + to add an event, birthday, countdown and more.
                </Text>
              </View>
            ) : (
              dayItemGroups.map((group) => (
                <View key={group.key} style={styles.dayItemGroup}>
                  <View style={styles.dayItemGroupHeader}>
                    <View style={[styles.dayItemGroupBar, { backgroundColor: group.color }]} />
                    <Text style={[styles.dayItemGroupTitle, { color: group.color }]}>{group.label}</Text>
                    <Text style={[styles.dayItemGroupCount, { color: colors.textSecondary }]}>{group.items.length}</Text>
                  </View>
                  {group.items.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dayItem, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                      onPress={() =>
                        item.type === 'task'
                          ? navigation.navigate('TaskDetail', { taskId: item.id })
                          : navigation.navigate('EventDetail', { eventId: item.id })
                      }
                    >
                      <View style={[styles.dayItemDot, { backgroundColor: group.color }]} />
                      <View style={styles.dayItemInfo}>
                        <Text style={[styles.dayItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        {item.time && (
                          <Text style={[styles.dayItemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.time}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </>
        )}

        {/* ─── Tasks Tab ─── */}
        {selectedTab === 'Tasks' && (
          <>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
              {pendingCount} Pending · {doingCount} Doing · {doneCount} Done
            </Text>

            <SearchBar
              value={tasksQuery}
              onChangeText={setTasksQuery}
              placeholder="Search tasks..."
              colors={colors}
            />

            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tasks here</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Use + below to create your first task.
                </Text>
              </View>
            ) : (
              tasks.map((task: any) => {
                const isDone = task.status === 'completed';
                return (
                  <GlassCard key={task.id} style={styles.taskCard}>
                    <TouchableOpacity
                      style={styles.taskRow}
                      onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                    >
                      <TouchableOpacity
                        style={[styles.taskCheck, {
                          borderColor: isDone ? colors.success : colors.border,
                          backgroundColor: isDone ? colors.success : 'transparent',
                        }]}
                        onPress={() => handleCompleteTask(task.id)}
                      >
                        {isDone && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
                      </TouchableOpacity>
                      <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, { color: colors.textPrimary, textDecorationLine: isDone ? 'line-through' : 'none' }]} numberOfLines={1}>
                          {task.title}
                        </Text>
                        {task.deadline && (
                          <Text style={[styles.taskMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {format(new Date(task.deadline), 'MMM dd, yyyy')}
                          </Text>
                        )}
                      </View>
                      {task.priority && (
                        <View style={[styles.priorityDot, {
                          backgroundColor: task.priority === 'high' ? colors.danger : task.priority === 'medium' ? colors.warning : colors.accentPrimary
                        }]} />
                      )}
                    </TouchableOpacity>
                  </GlassCard>
                );
              })
            )}
          </>
        )}

        {/* ─── Events Tab ─── */}
        {selectedTab === 'Events' && (
          <>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </Text>

            <SearchBar
              value={eventsQuery}
              onChangeText={setEventsQuery}
              placeholder="Search events..."
              colors={colors}
            />

            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Events Area</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  No events yet. Tap + to create one.
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
                      <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>{event.title}</Text>
                      <Text style={[styles.eventDate, { color: colors.textSecondary }]} numberOfLines={1}>
                        {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : ''}
                        {event.event_type ? ` · ${event.event_type}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.id, event.title)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </GlassCard>
              ))
            )}
          </>
        )}

      </ScrollView>

      {/* Add menu (Calendar tab only — Tasks/Events tabs jump straight to their form) */}
      <Modal visible={addMenuOpen} transparent animationType="slide" onRequestClose={() => setAddMenuOpen(false)}>
        <View style={[styles.addMenuOverlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.addMenuContent, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.addMenuHeader}>
              <Text style={[styles.addMenuTitle, { color: colors.textPrimary }]}>Add</Text>
              <TouchableOpacity onPress={() => setAddMenuOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {ADD_MENU_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.addMenuOption}
                onPress={() => handleAddMenuSelect(option.key)}
              >
                <Ionicons name={option.icon} size={20} color={colors.accentPrimary} />
                <Text style={[styles.addMenuOptionText, { color: colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm, marginTop: 2 },
  tabBarWrapper: { marginBottom: spacing.sm },
  tabBar: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  tabText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: BOTTOM_NAV_SAFE_AREA, gap: spacing.base },
  dateLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.base },
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center' },
  dayItemGroup: { gap: spacing.sm },
  dayItemGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayItemGroupBar: { width: 4, height: 16, borderRadius: 2 },
  dayItemGroupTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, flex: 1 },
  dayItemGroupCount: { fontSize: typography.sizes.sm },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dayItemDot: { width: 8, height: 8, borderRadius: 4 },
  dayItemInfo: { flex: 1 },
  dayItemTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  dayItemMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  dayItemType: { fontSize: typography.sizes.xs },
  countLabel: { fontSize: typography.sizes.sm },
  taskCard: { marginBottom: 0 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: typography.sizes.base },
  taskMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  eventCard: { marginBottom: 0 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventBar: { width: 3, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  eventDate: { fontSize: typography.sizes.xs, marginTop: 2 },
  deleteBtn: { padding: spacing.xs },
  addMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addMenuContent: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  addMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addMenuTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
  },
  addMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  addMenuOptionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
