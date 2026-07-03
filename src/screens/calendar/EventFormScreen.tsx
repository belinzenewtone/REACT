import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { TaskEventForm } from '../../components/planner/TaskEventForm';
import type { RootStackParamList } from '../../navigation/types';

type EventFormRouteProp = RouteProp<RootStackParamList, 'EventForm'>;

export function EventFormScreen() {
  const route = useRoute<EventFormRouteProp>();
  return (
    <TaskEventForm
      editEventId={route.params?.eventId}
      defaultType={route.params?.type ?? 'event'}
    />
  );
}
