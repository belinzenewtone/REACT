import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDataVersion } from './dataVersion';
import { IncomeRepository, type IncomeDbRecord } from '../database/repositories/IncomeRepository';
import { RecurringRuleRepository, type RecurringRuleDbRecord } from '../database/repositories/RecurringRuleRepository';
import { BillRepository, type BillDbRecord, type BillCreateInput } from '../database/repositories/BillRepository';
import { GoalRepository, type GoalDbRecord, type GoalCreateInput } from '../database/repositories/GoalRepository';
import { FulizaLoanRepository, type FulizaLoanDbRecord } from '../database/repositories/FulizaLoanRepository';
import { ExportRepository, type ExportDbRecord, type ExportCreateInput } from '../database/repositories/ExportRepository';
import type { IncomeRecord, RecurringRule, Bill, Goal, FulizaLoan } from '../types';
import { syncRecurringReminders, syncBillReminders } from '../services/notificationSyncService';
import { cancelRecurringReminder, cancelBillReminder } from '../services/notificationService';
import { haptic } from '../utils/haptics';

interface PlannerState {
  isLoading: boolean;
  incomes: IncomeDbRecord[];
  recurringRules: RecurringRuleDbRecord[];
  bills: BillDbRecord[];
  goals: GoalDbRecord[];
  loans: FulizaLoanDbRecord[];
  exports: ExportDbRecord[];

  loadAll: (db: SQLiteDatabase) => Promise<void>;

  createIncome: (db: SQLiteDatabase, data: Omit<IncomeRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>) => Promise<void>;
  updateIncome: (db: SQLiteDatabase, id: string, data: Partial<IncomeRecord>) => Promise<void>;
  deleteIncome: (db: SQLiteDatabase, id: string) => Promise<void>;

  createRecurringRule: (db: SQLiteDatabase, data: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>) => Promise<void>;
  updateRecurringRule: (db: SQLiteDatabase, id: string, data: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (db: SQLiteDatabase, id: string) => Promise<void>;

  createBill: (db: SQLiteDatabase, data: BillCreateInput) => Promise<void>;
  updateBill: (db: SQLiteDatabase, id: string, data: Partial<Bill>) => Promise<void>;
  deleteBill: (db: SQLiteDatabase, id: string) => Promise<void>;

  createGoal: (db: SQLiteDatabase, data: GoalCreateInput) => Promise<void>;
  updateGoal: (db: SQLiteDatabase, id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (db: SQLiteDatabase, id: string) => Promise<void>;

  createLoan: (db: SQLiteDatabase, data: Omit<FulizaLoan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (db: SQLiteDatabase, id: string, data: Partial<FulizaLoan>) => Promise<void>;
  deleteLoan: (db: SQLiteDatabase, id: string) => Promise<void>;

  createExport: (db: SQLiteDatabase, data: ExportCreateInput) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  isLoading: false,
  incomes: [],
  recurringRules: [],
  bills: [],
  goals: [],
  loans: [],
  exports: [],

  loadAll: async (db) => {
    set({ isLoading: true });
    try {
      const [incomes, recurringRules, bills, goals, loans, exports] = await Promise.all([
        new IncomeRepository(db).findAll(),
        new RecurringRuleRepository(db).findAll(),
        new BillRepository(db).findAll(),
        new GoalRepository(db).findAll(),
        new FulizaLoanRepository(db).findAll(),
        new ExportRepository(db).findAll(),
      ]);
      set({ incomes, recurringRules, bills, goals, loans, exports, isLoading: false });
    } catch (error) {
      console.error('Failed to load planner data:', error);
      set({ isLoading: false });
    }
  },

  createIncome: async (db, data) => {
    await new IncomeRepository(db).create(data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  updateIncome: async (db, id, data) => {
    await new IncomeRepository(db).update(id, data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  deleteIncome: async (db, id) => {
    await new IncomeRepository(db).softDelete(id);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },

  createRecurringRule: async (db, data) => {
    await new RecurringRuleRepository(db).create(data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    // Reconcile all rules — cheaper than fetching the new id and simpler.
    await syncRecurringReminders(db).catch(() => {});
  },
  updateRecurringRule: async (db, id, data) => {
    await new RecurringRuleRepository(db).update(id, data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    await syncRecurringReminders(db, id).catch(() => {});
  },
  deleteRecurringRule: async (db, id) => {
    await new RecurringRuleRepository(db).softDelete(id);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    await cancelRecurringReminder(id).catch(() => {});
  },

  createBill: async (db, data) => {
    await new BillRepository(db).create(data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    await syncBillReminders(db).catch(() => {});
  },
  updateBill: async (db, id, data) => {
    await new BillRepository(db).update(id, data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    await syncBillReminders(db, id).catch(() => {});
  },
  deleteBill: async (db, id) => {
    await new BillRepository(db).softDelete(id);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    await cancelBillReminder(id).catch(() => {});
  },

  createGoal: async (db, data) => {
    await new GoalRepository(db).create(data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  updateGoal: async (db, id, data) => {
    await new GoalRepository(db).update(id, data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  deleteGoal: async (db, id) => {
    await new GoalRepository(db).softDelete(id);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },

  createLoan: async (db, data) => {
    await new FulizaLoanRepository(db).create(data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  updateLoan: async (db, id, data) => {
    await new FulizaLoanRepository(db).update(id, data);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },
  deleteLoan: async (db, id) => {
    await new FulizaLoanRepository(db).hardDelete(id);
    useDataVersion.getState().bump();
    await usePlannerStore.getState().loadAll(db);
    haptic('success');
  },

  createExport: async (db, data) => {
    await new ExportRepository(db).create(data);
    await usePlannerStore.getState().loadAll(db);
  },
}));
