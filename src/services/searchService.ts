import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository, type TransactionRecord } from '../database/repositories/TransactionRepository';
import { TaskRepository, type TaskRecord } from '../database/repositories/TaskRepository';
import { EventRepository, type EventRecord } from '../database/repositories/EventRepository';
import { BudgetRepository, type BudgetRecord } from '../database/repositories/BudgetRepository';
import type { SearchFilters } from '../store/useSearchStore';

export type SearchResultType = 'transaction' | 'task' | 'event' | 'budget' | 'merchant';

export interface MerchantResult {
  type: 'merchant';
  id: string;
  name: string;
  totalSpent: number;
  transactionCount: number;
}

export interface SearchResults {
  transactions: TransactionRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  budgets: BudgetRecord[];
  merchants: MerchantResult[];
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

  const merchantRows = trimmed
    ? await db.getAllAsync<{ merchant: string; total: number; count: number }>(
        `SELECT merchant, SUM(amount) as total, COUNT(*) as count FROM transactions
         WHERE deleted_at IS NULL AND transaction_type = 'expense' AND merchant LIKE ?
         GROUP BY merchant ORDER BY total DESC LIMIT ?`,
        [`%${trimmed}%`, limit]
      )
    : [];

  const merchants: MerchantResult[] = merchantRows.map((row) => ({
    type: 'merchant',
    id: row.merchant,
    name: row.merchant,
    totalSpent: row.total,
    transactionCount: row.count,
  }));

  return {
    transactions,
    tasks,
    events,
    budgets: matchingBudgets,
    merchants,
  };
}
