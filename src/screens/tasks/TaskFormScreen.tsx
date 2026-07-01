import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { TaskEventForm } from '../../components/planner/TaskEventForm';
import type { RootStackParamList } from '../../navigation/types';

type TaskFormRouteProp = RouteProp<RootStackParamList, 'TaskForm'>;

export function TaskFormScreen() {
  const route = useRoute<TaskFormRouteProp>();
  return <TaskEventForm editTaskId={route.params?.taskId} />;
}
