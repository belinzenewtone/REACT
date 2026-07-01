import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { computeProfileStats, type ProfileStats } from '../services/profileService';

interface ProfileState {
  stats: ProfileStats | null;
  isLoading: boolean;

  loadStats: (db: SQLiteDatabase) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  stats: null,
  isLoading: false,

  loadStats: async (db) => {
    set({ isLoading: true });
    try {
      const stats = await computeProfileStats(db);
      set({ stats, isLoading: false });
    } catch (error) {
      console.error('Failed to load profile stats:', error);
      set({ isLoading: false });
    }
  },
}));
