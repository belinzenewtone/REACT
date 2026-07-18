import { create } from 'zustand';

/**
 * Fine-grained mutation counters.
 *
 * `transactionVersion` — bumped by transaction CRUD and SMS imports.
 *   Triggers: dashboard, analytics, budgets.
 *
 * `plannerVersion` — bumped by bill/goal/loan/income mutations.
 *   Triggers: planner store only.
 *
 * `version` — legacy combined counter (max of both), kept for
 *   backward-compatible callers that don't need granularity.
 */
interface DataVersionStore {
  version: number;
  transactionVersion: number;
  plannerVersion: number;
  bump: () => void;
  bumpTransactions: () => void;
  bumpPlanner: () => void;
}

export const useDataVersion = create<DataVersionStore>((set) => ({
  version: 0,
  transactionVersion: 0,
  plannerVersion: 0,
  bump: () => set((s) => ({
    version: s.version + 1,
    transactionVersion: s.transactionVersion + 1,
    plannerVersion: s.plannerVersion + 1,
  })),
  bumpTransactions: () => set((s) => ({
    version: s.version + 1,
    transactionVersion: s.transactionVersion + 1,
  })),
  bumpPlanner: () => set((s) => ({
    version: s.version + 1,
    plannerVersion: s.plannerVersion + 1,
  })),
}));
