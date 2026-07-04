import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { BudgetRepository } from '../database/repositories/BudgetRepository';
import { TaskRepository } from '../database/repositories/TaskRepository';

interface WeeklyTrendItem {
  week: string;
  amount: number;
}

export interface WeeklyCategorySpendItem {
  week: string;
  label: string;
  categories: { category: string; amount: number; color: string }[];
  total: number;
}

interface MonthlyTrendItem {
  month: string;
  expense: number;
  income: number;
}

interface BudgetVsActualItem {
  category: string;
  budgeted: number;
  actual: number;
}

interface MerchantSpendItem {
  merchant: string;
  amount: number;
}

interface InsightItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface ProductivityData {
  tasksCompleted: number;
  tasksPending: number;
  completionRate: number;
}

export interface AnalyticsData {
  totalSpend: number;
  totalIncome: number;
  net: number;
  averageTransaction: number;
  weeklyTrend: WeeklyTrendItem[];
  weeklyCategorySpend: WeeklyCategorySpendItem[];
  monthlyTrend: MonthlyTrendItem[];
  budgetVsActual: BudgetVsActualItem[];
  topMerchants: MerchantSpendItem[];
  insights: InsightItem[];
  productivity: ProductivityData;
}

export async function computeAnalytics(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  rangeLabel: 'this_week' | 'this_month' | 'custom' = 'this_month'
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
    if (tx.transaction_type === 'expense' || tx.transaction_type === 'transfer' || tx.transaction_type === 'fuliza') {
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

  const categorySpendSorted = Array.from(categoryMap.entries())
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
  // Use local wall-clock month to match SMS-imported transaction storage.
  const spentByCategory = await budgetRepo.getSpentByCategory(
    start.getFullYear(),
    start.getMonth() + 1
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

  // Task productivity
  const taskRepo = new TaskRepository(db);
  const allTasks = await taskRepo.findAll();
  const tasksCompleted = allTasks.filter((t) => t.status === 'completed').length;
  const tasksPending = allTasks.filter((t) => t.status !== 'completed').length;
  const totalTasks = tasksCompleted + tasksPending;
  const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

  // Generate insights
  const rangeTitle =
    rangeLabel === 'this_week' ? 'This week' :
    rangeLabel === 'this_month' ? 'This month' :
    'This period';
  const insights: InsightItem[] = [];
  if (totalSpend > 0) {
    insights.push({
      icon: 'cash-outline',
      title: `${rangeTitle}: KSh ${totalSpend.toLocaleString()}`,
      description: `Across ${categorySpendSorted.length} categor${categorySpendSorted.length === 1 ? 'y' : 'ies'}`,
      color: categorySpendSorted[0]?.color ?? '#4DB8FF',
    });
  }
  if (tasksPending > 0) {
    insights.push({
      icon: 'alert-circle-outline',
      title: `${tasksPending} task${tasksPending !== 1 ? 's' : ''} need${tasksPending === 1 ? 's' : ''} attention`,
      description: `${completionRate.toFixed(0)}% completion rate`,
      color: '#EF4444',
    });
  }
  if (totalSpend > 0 && totalIncome > 0 && totalIncome > totalSpend) {
    const savingsRate = ((totalIncome - totalSpend) / totalIncome) * 100;
    insights.push({
      icon: 'trending-up-outline',
      title: `Saving ${savingsRate.toFixed(0)}% of income`,
      description: `Net: KSh ${(totalIncome - totalSpend).toLocaleString()}`,
      color: '#34D399',
    });
  }
  if (categorySpendSorted.length > 0) {
    insights.push({
      icon: 'bar-chart-outline',
      title: `Top category: ${categorySpendSorted[0].category}`,
      description: `KSh ${categorySpendSorted[0].amount.toLocaleString()} spent`,
      color: '#8B5CF6',
    });
  }

  const averageTransaction = transactions.length > 0
    ? transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length
    : 0;

  return {
    totalSpend,
    totalIncome,
    net: totalIncome - totalSpend,
    averageTransaction,
    weeklyTrend,
    weeklyCategorySpend,
    monthlyTrend,
    budgetVsActual,
    topMerchants,
    insights,
    productivity: { tasksCompleted, tasksPending, completionRate },
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
        (tx.transaction_type === 'expense' || tx.transaction_type === 'transfer' || tx.transaction_type === 'fuliza') &&
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
          (tx.transaction_type === 'expense' || tx.transaction_type === 'transfer' || tx.transaction_type === 'fuliza') &&
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
    // Local YYYY-MM key so it matches the local datetime strings stored by
    // the SMS parser.
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'short' });

    let expense = 0;
    let income = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(monthKey)) {
        if (tx.transaction_type === 'expense' || tx.transaction_type === 'transfer' || tx.transaction_type === 'fuliza') expense += tx.amount;
        else if (tx.transaction_type === 'income') income += tx.amount;
      }
    }

    months.push({ month: monthName, expense, income });
  }

  return months;
}
