import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../storage/fileStorage';

export interface SearchFilters {
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  type?: 'expense' | 'income' | 'transfer';
}

interface SearchState {
  recentSearches: string[];
  filters: SearchFilters;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setFilters: (filters: SearchFilters) => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      filters: {},

      addRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        set((state) => {
          const next = [trimmed, ...state.recentSearches.filter((s) => s !== trimmed)].slice(0, 10);
          return { recentSearches: next };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      setFilters: (filters) => set({ filters }),

      resetFilters: () => set({ filters: {} }),
    }),
    {
      name: 'search-store',
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        filters: state.filters,
      }),
    }
  )
);
