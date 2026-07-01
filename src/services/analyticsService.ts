import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { BudgetRepository } from '../database/repositories/BudgetRepository';

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  color: string;
}

export interface WeeklyTrendItem {
  week: string;
  amount: number;
}

export interface WeeklyCategorySpendItem {
  week: string;
  label: string;
  categories: { category: string; amount: number; color: string }[];
  total: number;
}

export interface MonthlyTrendItem {
  month: string;
  expense: number;
  income: number;
}

export interface BudgetVsActualItem {
  category: string;
  budgeted: number;
  actual: number;
}

export interface MerchantSpendItem {
  merchant: string;
  amount: number;
}

export interface AnalyticsData {
  totalSpend: number;
  totalIncome: number;
  net: number;
  averageTransaction: number;
  categoryBreakdown: CategoryBreakdownItem[];
  weeklyTrend: WeeklyTrendItem[];
  weeklyCategorySpend: WeeklyCategorySpendItem[];
  monthlyTrend: MonthlyTrendItem[];
  budgetVsActual: BudgetVsActualItem[];
  topMerchants: MerchantSpendItem[];
}

export async function computeAnalytics(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<AnalyticsData> {
  const txRepo = new TransactionRepository(db);
  const budgetRepo = new BudgetRepository(db);

  const transactions = await txRepo.findAll({
    startDate,
    endDate,
    limit: 100000,
    orderBy: 'date_desc',
  });

  let totalSpend = 0;
  let totalIncome = 0;
  const categoryMap = new Map<string, number>();
  const merchantMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.transaction_type === 'expense') {
      totalSpend += tx.amount;
      categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount);
      merchantMap.set(tx.merchant, (merchantMap.get(tx.merchant) ?? 0) + tx.amount);
    } else if (tx.transaction_type === 'income') {
      totalIncome += tx.amount;
    }
  }

  const categoryColors: Record<string, string> = {
    food: '#F59E0B',
    transport: '#3B82F6',
    utilities: '#8B5CF6',
    groceries: '#10B981',
    rent: '#EF4444',
    airtime: '#06B6D4',
    entertainment: '#EC4899',
    health: '#F97316',
    education: '#6366F1',
    shopping: '#D946EF',
    savings: '#22C55E',
    investment: '#14B8A6',
    income: '#34D399',
    uncategorized: '#6B7280',
  };

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      color: categoryColors[category] ?? '#6B7280',
    }))
    .sort((a, b) => b.amount - a.amount);

  const topMerchants: MerchantSpendItem[] = Array.from(merchantMap.entries())
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Weekly trend (last 12 weeks)
  const weeklyTrend = computeWeeklyTrend(transactions);

  // Weekly spend by category (last 5 weeks) for stacked bar chart
  const weeklyCategorySpend = computeWeeklyCategorySpend(transactions, categoryColors);

  // Monthly trend (last 12 months)
  const monthlyTrend = computeMonthlyTrend(transactions);

  // Budget vs actual
  const start = new Date(startDate);
  const budgets = await budgetRepo.findAll();
  const spentByCategory = await budgetRepo.getSpentByCategory(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1
  );
  const spentMap = new Map(spentByCategory.map((s) => [s.category, s.spent]));

  const budgetVsActual: BudgetVsActualItem[] = budgets
    .map((b) => ({
      category: b.category,
      budgeted: b.limit_amount,
      actual: spentMap.get(b.category) ?? 0,
    }))
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 5);

  const averageTransaction = transactions.length > 0
    ? transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length
    : 0;

  return {
    totalSpend,
    totalIncome,
    net: totalIncome - totalSpend,
    averageTransaction,
    categoryBreakdown,
    weeklyTrend,
    weeklyCategorySpend,
    monthlyTrend,
    budgetVsActual,
    topMerchants,
  };
}

function computeWeeklyCategorySpend(
  transactions: { date: string; transaction_type: string; amount: number; category: string }[],
  categoryColors: Record<string, string>
): WeeklyCategorySpendItem[] {
  const now = new Date();
  const weeks: WeeklyCategorySpendItem[] = [];
  const labels = ['W-4', 'W-3', 'W-2', 'Last wk', 'This wk'];

  for (let i = 4; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const categoryMap = new Map<string, number>();
    let total = 0;

    for (const tx of transactions) {
      if (
        tx.transaction_type === 'expense' &&
        new Date(tx.date) >= weekStart &&
        new Date(tx.date) <= weekEnd
      ) {
        categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount);
        total += tx.amount;
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        color: categoryColors[category] ?? '#6B7280',
      }))
      .sort((a, b) => b.amount - a.amount);

    weeks.push({
      week: `W${5 - i}`,
      label: labels[4 - i],
      categories,
      total,
    });
  }

  return weeks;
}

function computeWeeklyTrend(transactions: { date: string; transaction_type: string; amount: number }[]): WeeklyTrendItem[] {
  const now = new Date();
  const weeks: WeeklyTrendItem[] = [];

  for (let i = 11; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const amount = transactions
      .filter(
        (tx) =>
          tx.transaction_type === 'expense' &&
          new Date(tx.date) >= weekStart &&
          new Date(tx.date) <= weekEnd
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    weeks.push({
      week: `W${12 - i}`,
      amount,
    });
  }

  return weeks;
}

function computeMonthlyTrend(transactions: { date: string; transaction_type: string; amount: number }[]): MonthlyTrendItem[] {
  const months: MonthlyTrendItem[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const monthName = d.toLocaleString('default', { month: 'short' });

    let expense = 0;
    let income = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(monthKey)) {
        if (tx.transaction_type === 'expense') expense += tx.amount;
        else if (tx.transaction_type === 'income') income += tx.amount;
      }
    }

    months.push({ month: monthName, expense, income });
  }

  return months;
}
