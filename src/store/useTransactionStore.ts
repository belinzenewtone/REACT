import { create } from 'zustand';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import type { Transaction, TransactionType, TransactionStatus } from '../types';
import type { TransactionRecord } from '../database/repositories/TransactionRepository';
import type { TransactionRepository } from '../database/repositories/TransactionRepository';
import { useDataVersion } from './dataVersion';
import { checkBudgetThresholds } from '../services/budgetAlertService';
import { toLocalIso } from '../utils/formatters';
import { haptic } from '../services/haptics';
import { recordCorrection, trainModel } from '../services/ml/transactionClassifier';

export type TransactionPeriod = 'all' | 'today' | 'week' | 'month';

interface FilterState {
  search: string;
  category: string;
  type: TransactionType | undefined;
  status: TransactionStatus | undefined;
  orderBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  period: TransactionPeriod;
}

interface TransactionState {
  transactions: TransactionRecord[];
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
  filters: FilterState;

  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  loadTransactions: (repo: TransactionRepository, reset?: boolean) => Promise<void>;
  addTransaction: (repo: TransactionRepository, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>) => Promise<void>;
  updateTransaction: (repo: TransactionRepository, id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (repo: TransactionRepository, id: string) => Promise<void>;
}

const defaultFilters: FilterState = {
  search: '',
  category: 'all',
  type: undefined,
  status: undefined,
  orderBy: 'date_desc',
  period: 'all',
};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  hasMore: true,
  offset: 0,
  filters: defaultFilters,

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  loadTransactions: async (repo, reset = false) => {
    set({ isLoading: true });
    try {
      const { filters, offset } = get();
      const nextOffset = reset ? 0 : offset;

      const category = filters.category === 'all' ? undefined : filters.category;
      const search = filters.search.trim() || undefined;

      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();
      switch (filters.period) {
        case 'today':
          startDate = toLocalIso(startOfDay(now));
          endDate = toLocalIso(endOfDay(now));
          break;
        case 'week':
          startDate = toLocalIso(startOfWeek(now, { weekStartsOn: 1 }));
          endDate = toLocalIso(endOfWeek(now, { weekStartsOn: 1 }));
          break;
        case 'month':
          startDate = toLocalIso(startOfMonth(now));
          endDate = toLocalIso(endOfMonth(now));
          break;
      }

      const rows = await repo.findAll({
        limit: 50,
        offset: nextOffset,
        category,
        type: filters.type,
        status: filters.status,
        search,
        orderBy: filters.orderBy,
        startDate,
        endDate,
      });

      set((state) => ({
        transactions: reset ? rows : [...state.transactions, ...rows],
        hasMore: rows.length === 50,
        offset: nextOffset + rows.length,
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (repo, data) => {
    await repo.create(data);
    useDataVersion.getState().bumpTransactions();
    await get().loadTransactions(repo, true);
    // Fire budget alerts for the transaction's category (no-op if the user
    // hasn't enabled budget alerts).
    if (data.category && data.transactionType === 'expense') {
      checkBudgetThresholds(repo.database, data.category).catch(() => {});
    }
    haptic('success');
  },

  updateTransaction: async (repo, id, data) => {
    // Optimistic update: apply changes to local state immediately
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(data.merchant !== undefined && { merchant: data.merchant }),
              ...(data.category !== undefined && { category: data.category }),
              ...(data.amount !== undefined && { amount: data.amount }),
              ...(data.date !== undefined && { date: data.date }),
              ...(data.transactionType !== undefined && { transaction_type: data.transactionType }),
              ...(data.status !== undefined && { status: data.status }),
              ...(data.description !== undefined && { description: data.description ?? null }),
              ...(data.notes !== undefined && { notes: data.notes ?? null }),
            }
          : t
      ),
    }));
    haptic('light');
    await repo.update(id, data);
    useDataVersion.getState().bumpTransactions();
    // Background reconcile — no need to block UI
    get().loadTransactions(repo, true).catch(() => {});
    if (data.category && data.transactionType === 'expense') {
      checkBudgetThresholds(repo.database, data.category).catch(() => {});
    }
    if (data.category) {
      repo.findById(id).then(tx => {
        if (!tx) return;
        recordCorrection(repo.database, {
          amount: tx.amount,
          date: tx.date,
          transaction_type: tx.transaction_type,
          merchant: tx.merchant,
        }, data.category!).then(() => trainModel(repo.database)).catch(() => {});
      }).catch(() => {});
    }
  },

  deleteTransaction: async (repo, id) => {
    // Optimistic removal: splice from local state immediately
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    haptic('warning');
    await repo.softDelete(id);
    useDataVersion.getState().bumpTransactions();
    // Background reconcile
    get().loadTransactions(repo, true).catch(() => {});
  },
}));
