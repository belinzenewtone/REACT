import { create } from 'zustand';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { BudgetRepository } from '../database/repositories/BudgetRepository';
import { TaskRepository } from '../database/repositories/TaskRepository';
import { EventRepository } from '../database/repositories/EventRepository';
import type { BudgetProgressItem, AgendaItem, RecentTransactionItem } from '../components/dashboard';

interface DashboardState {
  isLoading: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  income: number;
  expense: number;
  lastMonthIncome: number;
  lastMonthExpense: number;
  todaySpend: number;
  weekSpend: number;
  pendingTaskCount: number;
  nextEvent: { id: string; title: string; date: string } | null;
  budgets: BudgetProgressItem[];
  agenda: AgendaItem[];
  recentTransactions: RecentTransactionItem[];

  loadDashboard: (db: SQLiteDatabase) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isLoading: true,
  hasLoadedOnce: false,
  error: null,
  income: 0,
  expense: 0,
  lastMonthIncome: 0,
  lastMonthExpense: 0,
  todaySpend: 0,
  weekSpend: 0,
  pendingTaskCount: 0,
  nextEvent: null,
  budgets: [],
  agenda: [],
  recentTransactions: [],

  loadDashboard: async (db) => {
    set({ isLoading: true, error: null });

    try {
      const txRepo = new TransactionRepository(db);
      const budgetRepo = new BudgetRepository(db);
      const taskRepo = new TaskRepository(db);
      const eventRepo = new EventRepository(db);

      const now = new Date();
      const thisYear = now.getUTCFullYear();
      const thisMonth = now.getUTCMonth() + 1;
      const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
      const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

      const thisMonthTotals = await txRepo.getMonthlyTotals(thisYear, thisMonth);
      const lastMonthTotals = await txRepo.getMonthlyTotals(lastMonthYear, lastMonth);

      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const todayTotals = await txRepo.getTotalsInRange(todayStart, todayEnd);

      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekTotals = await txRepo.getTotalsInRange(weekStart, weekEnd);

      const budgetRecords = await budgetRepo.findAll();
      const spentByCategory = await budgetRepo.getSpentByCategory(thisYear, thisMonth);
      const spentMap = new Map(spentByCategory.map((s) => [s.category, s.spent]));

      const budgets: BudgetProgressItem[] = budgetRecords.map((b) => ({
        id: b.id,
        category: b.category,
        spent: spentMap.get(b.category) ?? 0,
        limit: b.limit_amount,
      }));

      const recent = await txRepo.findAll({ limit: 5, orderBy: 'date_desc' });
      const recentTransactions: RecentTransactionItem[] = recent.map((t) => ({
        id: t.id,
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        date: t.date,
        type: t.transaction_type,
      }));

      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      in7Days.setHours(23, 59, 59, 999);

      const tasks = await taskRepo.findAll({
        status: 'active',
        dueBefore: in7Days.toISOString(),
        limit: 10,
      });

      const agenda: AgendaItem[] = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        type: 'task',
        dueDate: t.deadline ?? t.created_at,
        completed: t.status === 'completed',
        priority: t.priority,
      }));

      const pendingTasks = await taskRepo.findAll({ status: 'active', limit: 1000 });
      const upcomingEvent = await eventRepo.findNextUpcoming();

      set({
        income: thisMonthTotals.income,
        expense: thisMonthTotals.expense,
        lastMonthIncome: lastMonthTotals.income,
        lastMonthExpense: lastMonthTotals.expense,
        todaySpend: todayTotals.expense,
        weekSpend: weekTotals.expense,
        pendingTaskCount: pendingTasks.length,
        nextEvent: upcomingEvent
          ? { id: upcomingEvent.id, title: upcomingEvent.title, date: upcomingEvent.date }
          : null,
        budgets,
        agenda,
        recentTransactions,
        isLoading: false,
        hasLoadedOnce: true,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      set({
        isLoading: false,
        hasLoadedOnce: true,
        error: error instanceof Error ? error.message : 'Failed to load dashboard',
      });
    }
  },
}));
