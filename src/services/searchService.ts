import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository, type TransactionRecord } from '../database/repositories/TransactionRepository';
import { TaskRepository, type TaskRecord } from '../database/repositories/TaskRepository';
import { EventRepository, type EventRecord } from '../database/repositories/EventRepository';
import { BudgetRepository, type BudgetRecord } from '../database/repositories/BudgetRepository';
import { RecurringRuleRepository, type RecurringRuleDbRecord as RecurringRuleRecord } from '../database/repositories/RecurringRuleRepository';
import type { SearchFilters } from '../store/useSearchStore';

export type SearchResultType = 'transaction' | 'task' | 'event' | 'budget' | 'birthday' | 'anniversary' | 'countdown' | 'recurring';

export interface SearchResults {
  transactions: TransactionRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  birthdays: EventRecord[];
  anniversaries: EventRecord[];
  countdowns: EventRecord[];
  budgets: BudgetRecord[];
  recurring: RecurringRuleRecord[];
}

export async function searchAll(
  db: SQLiteDatabase,
  query: string,
  filters: SearchFilters = {},
  limit: number = 50
): Promise<SearchResults> {
  const trimmed = query.trim();

  const txRepo = new TransactionRepository(db);
  const taskRepo = new TaskRepository(db);
  const eventRepo = new EventRepository(db);
  const budgetRepo = new BudgetRepository(db);
  const recurringRepo = new RecurringRuleRepository(db);

  const lowerQuery = trimmed.toLowerCase();

  const [tasks, events, budgets] = await Promise.all([
    trimmed ? taskRepo.search(trimmed, limit) : Promise.resolve<TaskRecord[]>([]),
    trimmed ? eventRepo.search(trimmed, limit) : Promise.resolve<EventRecord[]>([]),
    budgetRepo.findAll(),
  ]);

  const matchingBudgets = budgets
    .filter((b) => b.category.toLowerCase().includes(lowerQuery))
    .slice(0, limit);

  let transactions: TransactionRecord[] = [];
  if (trimmed || Object.keys(filters).length > 0) {
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

  const matchingEvents = events.filter((e) => {
    if (!trimmed) return false;
    const q = lowerQuery;
    return (
      e.title.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  const birthdays = matchingEvents.filter((e) => e.type === 'birthday');
  const anniversaries = matchingEvents.filter((e) => e.type === 'anniversary');
  const countdowns = matchingEvents.filter((e) => e.type === 'countdown');
  const regularEvents = matchingEvents.filter((e) => e.type === 'event');

  let recurring: RecurringRuleRecord[] = [];
  if (trimmed) {
    recurring = await recurringRepo.search(trimmed, limit);
  }

  return {
    transactions,
    tasks,
    events: regularEvents,
    birthdays,
    anniversaries,
    countdowns,
    budgets: matchingBudgets,
    recurring,
  };
}
