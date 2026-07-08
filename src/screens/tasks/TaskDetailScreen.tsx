import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme, Card, Text, Button, Chip, IconButton } from 'react-native-paper';
import { PageScaffold } from '../../components/common/PageScaffold';
import { useCalendarStore } from '../../store';
import { TaskRepository, type TaskRecord } from '../../database/repositories/TaskRepository';
import { formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import { syncTaskReminders } from '../../services/notificationSyncService';
import { cancelTaskReminders } from '../../services/notificationService';
import { haptic } from '../../services/haptics';
import { useDataVersion } from '../../store/dataVersion';
import type { RootStackParamList } from '../../navigation/types';

type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const theme = useTheme();
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
      <PageScaffold title="Task" onBack={() => navigation.goBack()} scrollable={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </PageScaffold>
    );
  }

  const priorityColor =
    task.priority === 'high'
      ? theme.colors.error
      : task.priority === 'medium'
      ? '#F5CB5C'
      : theme.colors.primary;
  const isCompleted = task.status === 'completed';

  return (
    <PageScaffold
      title="Task"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
          onPress={handleDelete}
        />
      }
    >
      <GlassCard style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Chip
            style={{ backgroundColor: `${priorityColor}33`, marginBottom: spacing.base }}
            textStyle={{ color: priorityColor }}
          >
            {task.priority.toUpperCase()}
          </Chip>
          <Text
            variant="headlineSmall"
            style={[styles.taskTitle, isCompleted && styles.completed, { color: theme.colors.onSurface }]}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              {task.description}
            </Text>
          ) : null}
          {task.deadline ? (
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={[styles.deadline, { color: theme.colors.onSurfaceVariant }]}>
                {formatDateTime(task.deadline)}
              </Text>
            </View>
          ) : null}
        </Card.Content>
      </GlassCard>

      <Button
        mode="contained"
        onPress={handleToggleComplete}
        style={{ backgroundColor: isCompleted ? theme.colors.primary : theme.colors.tertiary, marginTop: spacing.base }}
        textColor={isCompleted ? theme.colors.onPrimary : theme.colors.onTertiary}
      >
        {isCompleted ? 'Mark as Active' : 'Mark as Completed'}
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('TaskForm', { taskId })}
        style={{ marginTop: spacing.base }}
        textColor={theme.colors.onSurface}
      >
        Edit Task
      </Button>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  taskTitle: {
    textAlign: 'center',
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    textAlign: 'center',
    marginTop: spacing.base,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  deadline: {
    textAlign: 'center',
  },
});
