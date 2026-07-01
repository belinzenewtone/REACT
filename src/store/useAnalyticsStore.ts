import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { computeAnalytics, type AnalyticsData } from '../services/analyticsService';

export type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year';

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
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_3_months':
      start.setMonth(start.getMonth() - 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_6_months':
      start.setMonth(start.getMonth() - 6, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start: start.toISOString(), end: end.toISOString() };
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
      const { start, end } = getDateRange(get().dateRange);
      const data = await computeAnalytics(db, start, end);
      set({ data, isLoading: false });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      set({ isLoading: false });
    }
  },
}));
