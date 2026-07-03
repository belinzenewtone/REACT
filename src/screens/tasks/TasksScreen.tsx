import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { spacing, typography, borderRadius } from '../../theme';
import { animateLayout } from '../../utils/animation';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelTaskReminders } from '../../services/notificationService';
import { haptic } from '../../utils/haptics';
import { useDataVersion } from '../../store/dataVersion';

const COMPLETED_LIMIT = 20;

interface TimerState {
  taskId: string;
  startedAt: number;
  baseSeconds: number;
}

export function TasksScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { loadCalendar } = useCalendarStore();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [query, setQuery] = useState('');
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null);
  const [tick, setTick] = useState(0);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const loadTasks = useCallback(async () => {
    const repo = new TaskRepository(db);
    const all = await repo.findAll({ limit: 200 });
    setTasks(all);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
    );
  }, [tasks, query]);

  const grouped = useMemo(() => {
    const active = filteredTasks.filter((t) => t.status === 'active');
    const urgent = active.filter((t) => t.priority === 'high');
    const important = active.filter((t) => t.priority === 'medium');
    const rest = active.filter((t) => t.priority === 'low');
    const completed = filteredTasks
      .filter((t) => t.status === 'completed')
      .slice(0, COMPLETED_LIMIT);
    return { urgent, important, rest, completed };
  }, [filteredTasks]);

  const openCount = tasks.filter((t) => t.status === 'active').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleToggleComplete = async (task: TaskRecord) => {
    const repo = new TaskRepository(db);
    await repo.toggleComplete(task.id);
    await syncTaskReminders(db, task.id);
    useDataVersion.getState().bump();
    animateLayout();
    await loadCalendar(db);
    await loadTasks();
    // If the task was active before, we've just completed it → success pulse.
    haptic(task.status === 'active' ? 'success' : 'light');
  };

  const handleDelete = (task: TaskRecord) => {
    Alert.alert('Delete task', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new TaskRepository(db);
          await repo.softDelete(task.id);
          await cancelTaskReminders(task.id);
          useDataVersion.getState().bump();
          animateLayout();
          await loadCalendar(db);
          await loadTasks();
          haptic('warning');
        },
      },
    ]);
  };

  const handleToggleTimer = async (task: TaskRecord) => {
    if (activeTimer?.taskId === task.id) {
      const elapsed = Math.floor((Date.now() - activeTimer.startedAt) / 1000);
      const total = activeTimer.baseSeconds + elapsed;
      const repo = new TaskRepository(db);
      await repo.update(task.id, { timeSpentSeconds: total });
      setActiveTimer(null);
      await loadTasks();
    } else {
      if (activeTimer) {
        const prev = tasks.find((t) => t.id === activeTimer.taskId);
        if (prev) await handleToggleTimer(prev);
      }
      setActiveTimer({
        taskId: task.id,
        startedAt: Date.now(),
        baseSeconds: task.time_spent_seconds ?? 0,
      });
    }
  };

  const getElapsed = (taskId: string) => {
    if (!activeTimer || activeTimer.taskId !== taskId) return 0;
    return Math.floor((Date.now() - activeTimer.startedAt) / 1000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tasks</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {openCount} open · {completedCount} completed
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('TaskForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search tasks"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {grouped.urgent.length > 0 && (
          <PrioritySection
            title="Urgent"
            color={colors.priority.high}
            tasks={grouped.urgent}
            onToggleComplete={handleToggleComplete}
            onToggleTimer={handleToggleTimer}
            onDelete={handleDelete}
            activeTimerId={activeTimer?.taskId ?? null}
            getElapsed={getElapsed}
            formatTimer={formatTimer}
            onPressTask={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        )}

        {grouped.important.length > 0 && (
          <PrioritySection
            title="Important"
            color={colors.priority.medium}
            tasks={grouped.important}
            onToggleComplete={handleToggleComplete}
            onToggleTimer={handleToggleTimer}
            onDelete={handleDelete}
            activeTimerId={activeTimer?.taskId ?? null}
            getElapsed={getElapsed}
            formatTimer={formatTimer}
            onPressTask={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        )}

        {grouped.rest.length > 0 && (
          <PrioritySection
            title="Other"
            color={colors.priority.low}
            tasks={grouped.rest}
            onToggleComplete={handleToggleComplete}
            onToggleTimer={handleToggleTimer}
            onDelete={handleDelete}
            activeTimerId={activeTimer?.taskId ?? null}
            getElapsed={getElapsed}
            formatTimer={formatTimer}
            onPressTask={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        )}

        {grouped.completed.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCompletedExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIndicator, { backgroundColor: colors.textTertiary }]} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Completed</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{grouped.completed.length}</Text>
              <Ionicons
                name={completedExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {completedExpanded &&
              grouped.completed.map((task) => (
                <SwipeableTaskCard
                  key={task.id}
                  task={task}
                  color={colors.textTertiary}
                  onToggleComplete={() => handleToggleComplete(task)}
                  onToggleTimer={() => handleToggleTimer(task)}
                  onDelete={() => handleDelete(task)}
                  isTimerActive={activeTimer?.taskId === task.id}
                  elapsed={getElapsed(task.id)}
                  formatTimer={formatTimer}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))}
          </View>
        )}

        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface PrioritySectionProps {
  title: string;
  color: string;
  tasks: TaskRecord[];
  onToggleComplete: (task: TaskRecord) => void;
  onToggleTimer: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  activeTimerId: string | null;
  getElapsed: (taskId: string) => number;
  formatTimer: (seconds: number) => string;
  onPressTask: (task: TaskRecord) => void;
}

function PrioritySection({
  title,
  color,
  tasks,
  onToggleComplete,
  onToggleTimer,
  onDelete,
  activeTimerId,
  getElapsed,
  formatTimer,
  onPressTask,
}: PrioritySectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: color }]} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{tasks.length}</Text>
      </View>
      {tasks.map((task) => (
        <SwipeableTaskCard
          key={task.id}
          task={task}
          color={task.status === 'completed' ? colors.textTertiary : color}
          onToggleComplete={() => onToggleComplete(task)}
          onToggleTimer={() => onToggleTimer(task)}
          onDelete={() => onDelete(task)}
          isTimerActive={activeTimerId === task.id}
          elapsed={getElapsed(task.id)}
          formatTimer={formatTimer}
          onPress={() => onPressTask(task)}
        />
      ))}
    </View>
  );
}

interface SwipeableTaskCardProps {
  task: TaskRecord;
  color: string;
  onToggleComplete: () => void;
  onToggleTimer: () => void;
  onDelete: () => void;
  isTimerActive: boolean;
  elapsed: number;
  formatTimer: (seconds: number) => string;
  onPress: () => void;
}

const SWIPE_ACTION_WIDTH = 56;

function SwipeableTaskCard({ task, onToggleComplete, onDelete, onPress, ...rest }: SwipeableTaskCardProps) {
  const colors = useThemeColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const openSide = useRef<'none' | 'left' | 'right'>('none');

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    openSide.current = 'none';
  }, [translateX]);

  const openLeft = useCallback(() => {
    Animated.spring(translateX, { toValue: SWIPE_ACTION_WIDTH, useNativeDriver: true, friction: 8 }).start();
    openSide.current = 'left';
  }, [translateX]);

  const openRight = useCallback(() => {
    Animated.spring(translateX, { toValue: -SWIPE_ACTION_WIDTH, useNativeDriver: true, friction: 8 }).start();
    openSide.current = 'right';
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        const x = Math.max(-SWIPE_ACTION_WIDTH, Math.min(SWIPE_ACTION_WIDTH, gesture.dx));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 40) openLeft();
        else if (gesture.dx < -40) openRight();
        else close();
      },
    })
  ).current;

  const handleComplete = () => {
    close();
    onToggleComplete();
  };

  const handleDelete = () => {
    close();
    onDelete();
  };

  return (
    <View style={styles.swipeWrapper}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: colors.success }]}
        onPress={handleComplete}
      >
        <Ionicons name="checkmark" size={22} color={colors.textInverse} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: colors.danger }]}
        onPress={handleDelete}
      >
        <Ionicons name="trash" size={22} color={colors.textInverse} />
      </TouchableOpacity>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TaskCard
          task={task}
          onToggleComplete={onToggleComplete}
          {...rest}
          onPress={() => {
            if (openSide.current !== 'none') {
              close();
            } else {
              onPress();
            }
          }}
        />
      </Animated.View>
    </View>
  );
}

interface TaskCardProps {
  task: TaskRecord;
  color: string;
  onToggleComplete: () => void;
  onToggleTimer: () => void;
  isTimerActive: boolean;
  elapsed: number;
  formatTimer: (seconds: number) => string;
  onPress: () => void;
}

function TaskCard({
  task,
  color,
  onToggleComplete,
  onToggleTimer,
  isTimerActive,
  elapsed,
  formatTimer,
  onPress,
}: TaskCardProps) {
  const colors = useThemeColors();
  const displaySeconds = (task.time_spent_seconds ?? 0) + elapsed;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.priorityBar, { backgroundColor: color }]} />
      <TouchableOpacity
        style={[
          styles.checkbox,
          { borderColor: task.status === 'completed' ? colors.success : color },
          task.status === 'completed' && { backgroundColor: colors.success },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {task.status === 'completed' && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.textPrimary },
            task.status === 'completed' && styles.completed,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.timerButton, isTimerActive && { backgroundColor: `${colors.accentPrimary}20` }]}
        onPress={(e) => {
          e.stopPropagation();
          onToggleTimer();
        }}
      >
        <Ionicons
          name={isTimerActive ? 'stop' : 'timer-outline'}
          size={18}
          color={isTimerActive ? colors.accentPrimary : colors.textTertiary}
        />
        {(isTimerActive || displaySeconds > 0) && (
          <Text style={[styles.timerText, { color: isTimerActive ? colors.accentPrimary : colors.textTertiary }]}>
            {formatTimer(displaySeconds)}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
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
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.base,
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  sectionIndicator: {
    width: 4,
    height: 18,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  sectionCount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.base,
  },
  swipeWrapper: {
    marginBottom: spacing.base,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  swipeAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWIPE_ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
  },
  swipeActionLeft: {
    left: 0,
  },
  swipeActionRight: {
    right: 0,
  },
  priorityBar: {
    width: 4,
    height: 40,
    borderRadius: borderRadius.full,
    marginRight: spacing.base,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    minWidth: 32,
    justifyContent: 'center',
  },
  timerText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
  },
  emptyText: {
    fontSize: typography.sizes.base,
    marginTop: spacing.base,
  },
});
