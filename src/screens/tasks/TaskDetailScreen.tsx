import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelTaskReminders } from '../../services/notificationService';
import { haptic } from '../../services/haptics';
import { useDataVersion } from '../../store/dataVersion';
import type { RootStackParamList } from '../../navigation/types';

type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<TaskDetailRouteProp>();
  const { loadCalendar } = useCalendarStore();

  const taskId = route.params.taskId;
  const [task, setTask] = useState<TaskRecord | null>(null);

  useEffect(() => {
    const repo = new TaskRepository(db);
    repo.findById(taskId).then(setTask);
  }, [db, taskId]);

  const handleToggleComplete = async () => {
    if (!task) return;
    const repo = new TaskRepository(db);
    await repo.toggleComplete(taskId);
    await syncTaskReminders(db, taskId);
    const updated = await repo.findById(taskId);
    setTask(updated);
    useDataVersion.getState().bump();
    await loadCalendar(db);
    haptic(updated?.status === 'completed' ? 'success' : 'light');
  };

  const handleDelete = () => {
    Alert.alert('Delete task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new TaskRepository(db);
          await repo.softDelete(taskId);
          await cancelTaskReminders(taskId);
          useDataVersion.getState().bump();
          await loadCalendar(db);
          haptic('warning');
          navigation.goBack();
        },
      },
    ]);
  };

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: spacing.screenHorizontal }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = colors.priority[task.priority];
  const isCompleted = task.status === 'completed';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Task</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.taskTitle, isCompleted && styles.completed, { color: colors.textPrimary }]} numberOfLines={3}>
            {task.title}
          </Text>
          {task.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description}</Text>
          ) : null}
          {task.deadline ? (
            <Text style={[styles.deadline, { color: colors.textSecondary }]}>
              {formatDateTime(task.deadline)}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.statusButton,
            { backgroundColor: isCompleted ? colors.success : colors.accentPrimary },
          ]}
          onPress={handleToggleComplete}
        >
          <Text style={[styles.statusButtonText, { color: colors.textInverse }]} numberOfLines={1}>
            {isCompleted ? 'Mark as Active' : 'Mark as Completed'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.glassWhiteStrong, borderColor: colors.border }]}
          onPress={() => navigation.navigate('TaskForm', { taskId })}
        >
          <Text style={[styles.editButtonText, { color: colors.textPrimary }]} numberOfLines={1}>Edit Task</Text>
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
  taskTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  deadline: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  statusButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  editButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
