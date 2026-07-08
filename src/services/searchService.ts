import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository, type TransactionRecord } from '../database/repositories/TransactionRepository';
import { TaskRepository, type TaskRecord } from '../database/repositories/TaskRepository';
import { EventRepository, type EventRecord } from '../database/repositories/EventRepository';
import { BudgetRepository, type BudgetRecord } from '../database/repositories/BudgetRepository';
import { RecurringRuleRepository, type RecurringRuleDbRecord as RecurringRuleRecord } from '../database/repositories/RecurringRuleRepository';
import { BillRepository, type BillDbRecord } from '../database/repositories/BillRepository';
import { GoalRepository, type GoalDbRecord } from '../database/repositories/GoalRepository';
import { IncomeRepository, type IncomeDbRecord } from '../database/repositories/IncomeRepository';
import { FulizaLoanRepository, type FulizaLoanDbRecord } from '../database/repositories/FulizaLoanRepository';
import type { SearchFilters } from '../store/useSearchStore';

export type SearchResultType =
  | 'transaction' | 'task' | 'event'
  | 'birthday' | 'anniversary' | 'countdown'
  | 'budget' | 'recurring'
  | 'bill' | 'goal' | 'income' | 'loan';

export interface SearchResults {
  transactions: TransactionRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  birthdays: EventRecord[];
  anniversaries: EventRecord[];
  countdowns: EventRecord[];
  budgets: BudgetRecord[];
  recurring: RecurringRuleRecord[];
  bills: BillDbRecord[];
  goals: GoalDbRecord[];
  incomes: IncomeDbRecord[];
  loans: FulizaLoanDbRecord[];
}

const EMPTY: SearchResults = {
  transactions: [], tasks: [], events: [], birthdays: [], anniversaries: [],
  countdowns: [], budgets: [], recurring: [], bills: [], goals: [], incomes: [], loans: [],
};

/**
 * Search across every user-visible entity in the app.
 * Runs one SQL LIKE query per entity in parallel and caps each result set at
 * `limit` rows so a typing user never triggers unbounded scans.
 */
export async function searchAll(
  db: SQLiteDatabase,
  query: string,
  filters: SearchFilters = {},
  limit: number = 50
): Promise<SearchResults> {
  const trimmed = query.trim();
  const hasFilters = Object.keys(filters).length > 0;
  if (!trimmed && !hasFilters) return { ...EMPTY };

  const txRepo = new TransactionRepository(db);
  const taskRepo = new TaskRepository(db);
  const eventRepo = new EventRepository(db);
  const budgetRepo = new BudgetRepository(db);
  const recurringRepo = new RecurringRuleRepository(db);
  const billRepo = new BillRepository(db);
  const goalRepo = new GoalRepository(db);
  const incomeRepo = new IncomeRepository(db);
  const loanRepo = new FulizaLoanRepository(db);

  const runIfQuery = <T>(fn: () => Promise<T[]>): Promise<T[]> =>
    trimmed ? fn() : Promise.resolve([] as T[]);

  const [tasks, events, budgets, recurring, bills, goals, incomes, loans] = await Promise.all([
    runIfQuery(() => taskRepo.search(trimmed, limit)),
    runIfQuery(() => eventRepo.search(trimmed, limit)),
    runIfQuery(() => budgetRepo.search(trimmed, limit)),
    runIfQuery(() => recurringRepo.search(trimmed, limit)),
    runIfQuery(() => billRepo.search(trimmed, limit)),
    runIfQuery(() => goalRepo.search(trimmed, limit)),
    runIfQuery(() => incomeRepo.search(trimmed, limit)),
    runIfQuery(() => loanRepo.search(trimmed, limit)),
  ]);

  let transactions: TransactionRecord[] = [];
  if (trimmed || hasFilters) {
    transactions = await txRepo.findAll({
      search: trimmed || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      category: filters.category,
      type: filters.type,
      limit,
      orderBy: 'date_desc',
    });

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      transactions = transactions.filter((tx) => {
        if (filters.minAmount !== undefined && tx.amount < filters.minAmount) return false;
        if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) return false;
        return true;
      });
    }
  }

  // Split events by type — the repo query already filtered by title/desc/location.
  const birthdays = events.filter((e) => e.type === 'birthday');
  const anniversaries = events.filter((e) => e.type === 'anniversary');
  const countdowns = events.filter((e) => e.type === 'countdown');
  const regularEvents = events.filter((e) => e.type === 'event');

  return {
    transactions,
    tasks,
    events: regularEvents,
    birthdays,
    anniversaries,
    countdowns,
    budgets,
    recurring,
    bills,
    goals,
    incomes,
    loans,
  };
}
