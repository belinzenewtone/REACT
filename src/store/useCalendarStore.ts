import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { EventRepository, type EventRecord } from '../database/repositories/EventRepository';
import { TaskRepository, type TaskRecord } from '../database/repositories/TaskRepository';
import type { DayEvent } from '../types';

interface CalendarState {
  isLoading: boolean;
  selectedDate: string;
  currentYear: number;
  currentMonth: number;
  /** Per-day flags for the visible month, keyed by 'YYYY-MM-DD'. */
  eventsByDate: Map<string, { hasEvent: boolean; hasTask: boolean }>;
  /** Fully materialized items for the selected day (recurring occurrences expanded). */
  dayItems: DayEvent[];
  allTasks: TaskRecord[];
  allEvents: EventRecord[];

  setSelectedDate: (date: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  loadCalendar: (db: SQLiteDatabase) => Promise<void>;
}

// ── Recurring-event helpers ────────────────────────────────────────────────

/**
 * Given a source event and a visible-month window, produce the concrete
 * occurrence dates (as ISO strings, only the "date" portion — same clock time
 * as the source event) that fall inside the window.
 *
 * Supports repeat_rule: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
 * respecting `repeat_end_date` if set.
 *
 * For multi-day events (end_date > date), every intermediate day within the
 * window is included as an occurrence so month indicators + day agendas
 * render correctly across the range.
 */
function expandEventOccurrences(
  event: EventRecord,
  windowStart: Date,
  windowEnd: Date,
): { occurrenceDate: string; occurrenceIndex: number; spanDays: number }[] {
  const out: { occurrenceDate: string; occurrenceIndex: number; spanDays: number }[] = [];
  const startBase = new Date(event.date);
  if (isNaN(startBase.getTime())) return out;
  const endBase = event.end_date ? new Date(event.end_date) : startBase;
  const spanMs = Math.max(0, endBase.getTime() - startBase.getTime());
  const spanDays = Math.max(1, Math.floor(spanMs / 86_400_000) + 1);

  const repeatEnd = event.repeat_end_date ? new Date(event.repeat_end_date).getTime() : Number.POSITIVE_INFINITY;
  const winStartMs = windowStart.getTime();
  const winEndMs = windowEnd.getTime();

  const emitRange = (occurrenceStart: Date, occurrenceIndex: number) => {
    // Iterate every day in the multi-day span that falls within the window.
    for (let i = 0; i < spanDays; i++) {
      const day = new Date(occurrenceStart);
      day.setUTCDate(day.getUTCDate() + i);
      const ms = day.getTime();
      if (ms < winStartMs || ms >= winEndMs) continue;
      out.push({
        occurrenceDate: day.toISOString(),
        occurrenceIndex,
        spanDays,
      });
    }
  };

  const rule = event.repeat_rule ?? 'none';
  if (rule === 'none') {
    emitRange(startBase, 0);
    return out;
  }

  // Walk forward from the base date, capped by repeat_end_date and window.
  // Hard-cap iteration to avoid runaway loops on bad data.
  const HARD_CAP = 400;
  let occurrenceIndex = 0;
  let cursor = new Date(startBase);
  while (occurrenceIndex < HARD_CAP) {
    const cursorMs = cursor.getTime();
    if (cursorMs > repeatEnd) break;
    if (cursorMs >= winEndMs) break;
    // Skip forward until the window if the base date is far in the past.
    const endOfOccurrenceMs = cursorMs + spanMs;
    if (endOfOccurrenceMs >= winStartMs) {
      emitRange(cursor, occurrenceIndex);
    }
    occurrenceIndex++;
    cursor = advanceByRule(cursor, rule);
    if (cursor.getTime() === cursorMs) break; // guard against non-progress
  }
  return out;
}

function advanceByRule(d: Date, rule: string): Date {
  const next = new Date(d);
  switch (rule) {
    case 'daily':   next.setUTCDate(next.getUTCDate() + 1); break;
    case 'weekly':  next.setUTCDate(next.getUTCDate() + 7); break;
    case 'monthly': next.setUTCMonth(next.getUTCMonth() + 1); break;
    case 'yearly':  next.setUTCFullYear(next.getUTCFullYear() + 1); break;
    default:        next.setUTCDate(next.getUTCDate() + 1); break;
  }
  return next;
}

/** Whole-day difference between two dates, ignoring time. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
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

    goToToday: () => {
      const now = new Date();
      set({
        currentYear: now.getUTCFullYear(),
        currentMonth: now.getUTCMonth() + 1,
        selectedDate: now.toISOString(),
      });
    },

    loadCalendar: async (db) => {
      set({ isLoading: true });
      try {
        const eventRepo = new EventRepository(db);
        const taskRepo = new TaskRepository(db);
        const { currentYear, currentMonth, selectedDate } = get();

        // Visible-month window (UTC-based).
        const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const end = new Date(Date.UTC(currentYear, currentMonth, 1));

        // Fetch ALL events that could contribute occurrences in the window.
        // A repeating event may start well before the window — include everything
        // and expand in memory. Then bound tasks between month start & end.
        const [allEventsForWindow, monthTasks] = await Promise.all([
          eventRepo.findAll(),
          taskRepo.findAll({
            dueBefore: end.toISOString(),
            dueAfter: start.toISOString(),
            limit: 500,
          }),
        ]);

        const eventsByDate = new Map<string, { hasEvent: boolean; hasTask: boolean }>();

        // ── Expand repeating + multi-day events into the visible month ──
        for (const event of allEventsForWindow) {
          const occurrences = expandEventOccurrences(event, start, end);
          for (const occ of occurrences) {
            const dateStr = occ.occurrenceDate.split('T')[0];
            const existing = eventsByDate.get(dateStr) ?? { hasEvent: false, hasTask: false };
            existing.hasEvent = true;
            eventsByDate.set(dateStr, existing);
          }
        }

        // ── Mark task deadlines ──
        for (const task of monthTasks) {
          if (!task.deadline) continue;
          const dateStr = task.deadline.split('T')[0];
          const existing = eventsByDate.get(dateStr) ?? { hasEvent: false, hasTask: false };
          existing.hasTask = true;
          eventsByDate.set(dateStr, existing);
        }

        // ── Build the selected-day agenda ──
        const selectedStart = new Date(selectedDate);
        selectedStart.setUTCHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedStart);
        selectedEnd.setUTCDate(selectedEnd.getUTCDate() + 1);

        // Expand every source event into occurrences falling on the selected day.
        const selectedDayItems: DayEvent[] = [];
        for (const event of allEventsForWindow) {
          const occs = expandEventOccurrences(event, selectedStart, selectedEnd);
          if (occs.length === 0) continue;
          for (const occ of occcurrenceUnique(occs)) {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const daysToGo = daysBetween(today, new Date(occ.occurrenceDate));
            selectedDayItems.push({
              id: occ.occurrenceIndex > 0 ? `${event.id}#${occ.occurrenceIndex}` : event.id,
              title: event.title,
              date: occ.occurrenceDate,
              type: event.type as DayEvent['type'],
              priority: event.importance as DayEvent['priority'],
              location: event.location,
              allDay: event.all_day === 1,
              occurrenceIndex: occ.occurrenceIndex,
              daysToGo: event.type === 'countdown' ? daysToGo : undefined,
            });
          }
        }

        const selectedTasks = await taskRepo.findAll({
          dueBefore: selectedEnd.toISOString(),
          dueAfter: selectedStart.toISOString(),
          limit: 100,
        });

        const dayItems: DayEvent[] = [
          ...selectedDayItems,
          ...selectedTasks.map((t) => ({
            id: t.id,
            title: t.title,
            date: t.deadline ?? t.created_at,
            type: 'task' as const,
            priority: t.priority as DayEvent['priority'],
            completed: t.status === 'completed',
          })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Snapshot lists for other screens that read the store.
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

/** Deduplicate occurrences that share the same day (e.g. multi-day span
 *  overlap with a same-day repeat), keeping the first index encountered. */
function occcurrenceUnique(
  occurrences: { occurrenceDate: string; occurrenceIndex: number; spanDays: number }[],
): { occurrenceDate: string; occurrenceIndex: number; spanDays: number }[] {
  const seen = new Set<string>();
  const out: { occurrenceDate: string; occurrenceIndex: number; spanDays: number }[] = [];
  for (const occ of occurrences) {
    const day = occ.occurrenceDate.split('T')[0];
    if (seen.has(day)) continue;
    seen.add(day);
    out.push(occ);
  }
  return out;
}
