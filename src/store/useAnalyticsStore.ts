import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { toLocalIso } from '../utils/formatters';
import { computeAnalytics, type AnalyticsData } from '../services/analyticsService';

export type DateRange = 'this_week' | 'this_month';

interface AnalyticsState {
  data: AnalyticsData | null;
  isLoading: boolean;
  dateRange: DateRange;

  setDateRange: (range: DateRange) => void;
  loadAnalytics: (db: SQLiteDatabase) => Promise<void>;
}

function getDateRange(range: DateRange): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (range) {
    case 'this_week': {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  // Local datetime strings to match SMS-imported transaction date storage.
  return { start: toLocalIso(start), end: toLocalIso(end) };
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  data: null,
  isLoading: false,
  dateRange: 'this_month',

  setDateRange: (range) => {
    set({ dateRange: range });
  },

  loadAnalytics: async (db) => {
    set({ isLoading: true });
    try {
      const range = get().dateRange;
      const { start, end } = getDateRange(range);
      const data = await computeAnalytics(db, start, end, range);
      set({ data, isLoading: false });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      set({ isLoading: false });
    }
  },
}));
