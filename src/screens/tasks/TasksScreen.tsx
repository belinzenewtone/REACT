import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Checkbox, IconButton, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { animateLayout } from '../../utils/animation';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelTaskReminders } from '../../services/notificationService';
import { haptic } from '../../services/haptics';
import { useDataVersion } from '../../store/dataVersion';
import { PageScaffold } from '../../components/common/PageScaffold';

const COMPLETED_LIMIT = 20;
const SUCCESS = '#7BC47B';
const WARNING = '#F5CB5C';

interface TimerState {
  taskId: string;
  startedAt: number;
  baseSeconds: number;
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

export function TasksScreen() {
  const theme = useTheme();
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
    <PageScaffold
      title="Tasks"
      subtitle={`${openCount} open · ${completedCount} completed`}
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          icon={() => <Ionicons name="add" size={22} color={theme.colors.onSurface} />}
          onPress={() => navigation.navigate('TaskForm')}
        />
      }
    >
      <TextInput
        mode="outlined"
        dense
        value={query}
        onChangeText={setQuery}
        placeholder="Search tasks"
        style={[styles.searchInput, { backgroundColor: theme.colors.surfaceVariant }]}
        left={
          <TextInput.Icon
            icon={() => <Ionicons name="search" size={18} color={theme.colors.onSurfaceVariant} />}
          />
        }
      />

      {grouped.urgent.length > 0 && (
        <PrioritySection
          title="Urgent"
          color={theme.colors.error}
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
          color={WARNING}
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
          color={theme.colors.primary}
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
          <TouchableRipple onPress={() => setCompletedExpanded((v) => !v)}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIndicator, { backgroundColor: theme.colors.outline }]} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                Completed
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {grouped.completed.length}
              </Text>
              <Ionicons
                name={completedExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableRipple>
          {completedExpanded &&
            grouped.completed.map((task) => (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                color={theme.colors.outline}
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
          <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.colors.outline} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No tasks found
          </Text>
        </View>
      )}
    </PageScaffold>
  );
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
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: color }]} />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {tasks.length}
        </Text>
      </View>
      {tasks.map((task) => (
        <SwipeableTaskCard
          key={task.id}
          task={task}
          color={task.status === 'completed' ? theme.colors.outline : color}
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

const SWIPE_ACTION_WIDTH = 56;

function SwipeableTaskCard({ task, onToggleComplete, onDelete, onPress, ...rest }: SwipeableTaskCardProps) {
  const theme = useTheme();
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

  const handleDeleteAction = () => {
    close();
    onDelete();
  };

  return (
    <View style={styles.swipeWrapper}>
      <TouchableRipple
        style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: SUCCESS }]}
        onPress={handleComplete}
      >
        <Ionicons name="checkmark" size={22} color={theme.colors.onPrimary} />
      </TouchableRipple>
      <TouchableRipple
        style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: theme.colors.error }]}
        onPress={handleDeleteAction}
      >
        <Ionicons name="trash" size={22} color={theme.colors.onPrimary} />
      </TouchableRipple>

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
  const theme = useTheme();
  const displaySeconds = (task.time_spent_seconds ?? 0) + elapsed;
  const isDone = task.status === 'completed';

  return (
    <GlassCard
      style={styles.card}
      onPress={onPress}
    >
      <Card.Content style={styles.cardRow}>
        <View style={[styles.priorityBar, { backgroundColor: color }]} />
        <Checkbox
          status={isDone ? 'checked' : 'unchecked'}
          onPress={onToggleComplete}
          color={isDone ? SUCCESS : color}
        />
        <View style={styles.cardContent}>
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
          {task.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}
        </View>
        <TouchableRipple
          style={[styles.timerButton, isTimerActive && { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={onToggleTimer}
        >
          <View style={styles.timerInner}>
            <Ionicons
              name={isTimerActive ? 'stop' : 'timer-outline'}
              size={18}
              color={isTimerActive ? theme.colors.primary : theme.colors.outline}
            />
            {(isTimerActive || displaySeconds > 0) && (
              <Text
                variant="labelMedium"
                style={{ color: isTimerActive ? theme.colors.primary : theme.colors.outline, marginLeft: 4 }}
              >
                {formatTimer(displaySeconds)}
              </Text>
            )}
          </View>
        </TouchableRipple>
      </Card.Content>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.full,
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
  },
  card: {
    borderRadius: borderRadius.lg,
    marginBottom: 0,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  priorityBar: {
    width: 4,
    height: 40,
    borderRadius: borderRadius.full,
  },
  cardContent: {
    flex: 1,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  timerButton: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
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
  emptyState: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
    gap: spacing.base,
  },
});
