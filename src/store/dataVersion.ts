import { create } from 'zustand';

/**
 * Global mutation counter. Any store that writes data calls bump().
 * Screens that show aggregated data (HomeScreen dashboard, BudgetsScreen)
 * compare their last-seen version against the current version on focus —
 * and only re-query if the version advanced. This avoids redundant DB
 * reads on every tab switch when nothing changed.
 */
interface DataVersionStore {
  version: number;
  bump: () => void;
}

export const useDataVersion = create<DataVersionStore>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
