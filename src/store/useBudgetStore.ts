import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { BudgetRepository } from '../database/repositories/BudgetRepository';
import type { BudgetRecord } from '../database/repositories/BudgetRepository';
import type { Budget } from '../types';

interface BudgetProgress {
  budget: BudgetRecord;
  spent: number;
  remaining: number;
  percent: number;
  isActive: boolean;
}

interface BudgetState {
  budgets: BudgetProgress[];
  isLoading: boolean;

  loadBudgets: (db: SQLiteDatabase) => Promise<void>;
  createBudget: (db: SQLiteDatabase, data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>) => Promise<void>;
  updateBudget: (db: SQLiteDatabase, id: string, data: Partial<Budget>) => Promise<void>;
  deleteBudget: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,

  loadBudgets: async (db) => {
    set({ isLoading: true });
    try {
      const repo = new BudgetRepository(db);
      const now = new Date();
      const budgets = await repo.findAll();
      const spent = await repo.getSpentByCategory(now.getUTCFullYear(), now.getUTCMonth() + 1);
      const spentMap = new Map(spent.map((s) => [s.category, s.spent]));

      const withProgress: BudgetProgress[] = budgets.map((b) => {
        const spentAmount = spentMap.get(b.category) ?? 0;
        return {
          budget: b,
          spent: spentAmount,
          remaining: Math.max(b.limit_amount - spentAmount, 0),
          percent: b.limit_amount > 0 ? Math.min((spentAmount / b.limit_amount) * 100, 100) : 0,
          isActive: b.is_active === 1,
        };
      });

      set({ budgets: withProgress, isLoading: false });
    } catch (error) {
      console.error('Failed to load budgets:', error);
      set({ isLoading: false });
    }
  },

  createBudget: async (db, data) => {
    const repo = new BudgetRepository(db);
    await repo.create(data);
    await get().loadBudgets(db);
  },

  updateBudget: async (db, id, data) => {
    const repo = new BudgetRepository(db);
    await repo.update(id, data);
    await get().loadBudgets(db);
  },

  deleteBudget: async (db, id) => {
    const repo = new BudgetRepository(db);
    await repo.softDelete(id);
    await get().loadBudgets(db);
  },
}));
