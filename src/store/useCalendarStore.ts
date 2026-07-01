import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { EventRepository, type EventRecord } from '../database/repositories/EventRepository';
import { TaskRepository, type TaskRecord } from '../database/repositories/TaskRepository';
import type { DayEvent } from '../components/calendar/DayAgenda';

interface CalendarState {
  isLoading: boolean;
  selectedDate: string;
  currentYear: number;
  currentMonth: number;
  eventsByDate: Map<string, { hasEvent: boolean; hasTask: boolean }>;
  dayItems: DayEvent[];
  allTasks: TaskRecord[];
  allEvents: EventRecord[];

  setSelectedDate: (date: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  loadCalendar: (db: SQLiteDatabase) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => {
  const today = new Date();

  return {
    isLoading: false,
    selectedDate: today.toISOString(),
    currentYear: today.getUTCFullYear(),
    currentMonth: today.getUTCMonth() + 1,
    eventsByDate: new Map(),
    dayItems: [],
    allTasks: [],
    allEvents: [],

    setSelectedDate: (date) => {
      set({ selectedDate: date });
      get().loadCalendar; // Will be called by effect
    },

    goToPrevMonth: () => {
      const { currentYear, currentMonth } = get();
      const newMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const newYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      set({ currentYear: newYear, currentMonth: newMonth });
    },

    goToNextMonth: () => {
      const { currentYear, currentMonth } = get();
      const newMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const newYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      set({ currentYear: newYear, currentMonth: newMonth });
    },

    loadCalendar: async (db) => {
      set({ isLoading: true });
      try {
        const eventRepo = new EventRepository(db);
        const taskRepo = new TaskRepository(db);
        const { currentYear, currentMonth, selectedDate } = get();

        const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const end = new Date(Date.UTC(currentYear, currentMonth, 1));

        const [events, tasks] = await Promise.all([
          eventRepo.findInRange(start.toISOString(), end.toISOString()),
          taskRepo.findAll({ dueBefore: end.toISOString(), limit: 200 }),
        ]);

        const eventsByDate = new Map<string, { hasEvent: boolean; hasTask: boolean }>();

        for (const event of events) {
          const dateStr = event.date.split('T')[0];
          const existing = eventsByDate.get(dateStr) ?? { hasEvent: false, hasTask: false };
          existing.hasEvent = true;
          eventsByDate.set(dateStr, existing);
        }

        for (const task of tasks) {
          if (!task.deadline) continue;
          const dateStr = task.deadline.split('T')[0];
          const existing = eventsByDate.get(dateStr) ?? { hasEvent: false, hasTask: false };
          existing.hasTask = true;
          eventsByDate.set(dateStr, existing);
        }

        // Load selected day items
        const selectedStr = selectedDate.split('T')[0];
        const selectedEvents = await eventRepo.findByDate(selectedDate);
        const selectedStart = new Date(selectedDate);
        selectedStart.setUTCHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedStart);
        selectedEnd.setUTCDate(selectedEnd.getUTCDate() + 1);

        const selectedTasks = await taskRepo.findAll({
          dueBefore: selectedEnd.toISOString(),
          limit: 50,
        });
        const filteredTasks = selectedTasks.filter((t) => {
          if (!t.deadline) return false;
          const d = new Date(t.deadline);
          return d >= selectedStart && d < selectedEnd;
        });

        const dayItems: DayEvent[] = [
          ...selectedEvents.map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            type: 'event' as const,
            priority: e.importance,
            location: e.location,
          })),
          ...filteredTasks.map((t) => ({
            id: t.id,
            title: t.title,
            date: t.deadline ?? t.created_at,
            type: 'task' as const,
            priority: t.priority,
            completed: t.status === 'completed',
          })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const [allTasks, allEvents] = await Promise.all([
          taskRepo.findAll({ limit: 500 }),
          eventRepo.findAll(),
        ]);

        set({ eventsByDate, dayItems, allTasks, allEvents, isLoading: false });
      } catch (error) {
        console.error('Failed to load calendar:', error);
        set({ isLoading: false });
      }
    },
  };
});
