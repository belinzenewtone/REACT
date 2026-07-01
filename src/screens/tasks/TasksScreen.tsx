import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { spacing, typography, borderRadius } from '../../theme';

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
    const urgent = filteredTasks.filter((t) => t.priority === 'high' && t.status === 'active');
    const important = filteredTasks.filter((t) => t.priority === 'medium' && t.status === 'active');
    const rest = filteredTasks.filter(
      (t) => (t.priority === 'low' && t.status === 'active') || t.status === 'completed'
    );
    return { urgent, important, rest };
  }, [filteredTasks]);

  const openCount = tasks.filter((t) => t.status === 'active').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleToggleComplete = async (task: TaskRecord) => {
    const repo = new TaskRepository(db);
    await repo.toggleComplete(task.id);
    await loadCalendar(db);
    await loadTasks();
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
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tasks</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {openCount} open · {completedCount} completed
          </Text>
        </View>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {grouped.urgent.length > 0 && (
          <PrioritySection
            title="Urgent"
            color={colors.priority.high}
            tasks={grouped.urgent}
            onToggleComplete={handleToggleComplete}
            onToggleTimer={handleToggleTimer}
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
            activeTimerId={activeTimer?.taskId ?? null}
            getElapsed={getElapsed}
            formatTimer={formatTimer}
            onPressTask={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        )}

        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentPrimary }]}
        onPress={() => navigation.navigate('TaskForm')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface PrioritySectionProps {
  title: string;
  color: string;
  tasks: TaskRecord[];
  onToggleComplete: (task: TaskRecord) => void;
  onToggleTimer: (task: TaskRecord) => void;
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
        <TaskCard
          key={task.id}
          task={task}
          color={task.status === 'completed' ? colors.textTertiary : color}
          onToggleComplete={() => onToggleComplete(task)}
          onToggleTimer={() => onToggleTimer(task)}
          isTimerActive={activeTimerId === task.id}
          elapsed={getElapsed(task.id)}
          formatTimer={formatTimer}
          onPress={() => onPressTask(task)}
        />
      ))}
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
        style={[styles.checkbox, task.status === 'completed' && { backgroundColor: colors.success, borderColor: colors.success }]}
        onPress={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
      >
        {task.status === 'completed' && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: typography.sizes.base,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
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
    marginBottom: spacing.base,
  },
  priorityBar: {
    width: 4,
    height: 40,
    borderRadius: borderRadius.full,
    marginRight: spacing.base,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
