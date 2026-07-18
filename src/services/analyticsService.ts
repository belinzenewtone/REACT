import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { BudgetRepository } from '../database/repositories/BudgetRepository';
import { TaskRepository } from '../database/repositories/TaskRepository';
import { toLocalIso } from '../utils/formatters';

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

export interface CategorySparklineItem {
  category: string;
  color: string;
  total: number;
  pctOfTotal: number;
  weeklyAmounts: number[]; // 4 values, oldest → newest
  topMerchant: string | null;
}

export interface FeesData {
  total: number;
  topCategory: string | null;
  avgFee: number;
  txCount: number;
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
  currentMonthSpend: number;
  prevMonthSpend: number;
  categorySparklines: CategorySparklineItem[];
  feesData: FeesData;
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

export async function computeAnalytics(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  rangeLabel: 'this_week' | 'this_month' | 'custom' = 'this_month'
): Promise<AnalyticsData> {
  const txRepo = new TransactionRepository(db);
  const budgetRepo = new BudgetRepository(db);
  const taskRepo = new TaskRepository(db);

  const now = new Date();
  const currMonthStart = toLocalIso(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
  const currMonthEnd = toLocalIso(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
  const prevMonthStart = toLocalIso(new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0));
  const prevMonthEnd = toLocalIso(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));

  const trendStart = toLocalIso(new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0));
  const start = new Date(startDate);

  const [
    rangeTotals,
    categorySpend,
    topMerchants,
    weeklyTrend,
    weeklyCatRows,
    monthlyTrend,
    feesData,
    averageTransaction,
    currentMonthSpend,
    prevMonthSpend,
    budgets,
    spentByCategory,
    taskCounts,
  ] = await Promise.all([
    txRepo.getTotalsInRange(startDate, endDate),
    txRepo.getCategorySpendInRange(startDate, endDate),
    txRepo.getTopMerchantsInRange(startDate, endDate, 10),
    txRepo.getWeeklySpendTrend(startDate, endDate),
    txRepo.getWeeklyCategorySpend(startDate, endDate),
    txRepo.getMonthlyTrendRange(trendStart, endDate),
    txRepo.getFeesSummaryInRange(startDate, endDate),
    txRepo.getAverageTransaction(startDate, endDate),
    txRepo.getSpendTotal(currMonthStart, currMonthEnd),
    txRepo.getSpendTotal(prevMonthStart, prevMonthEnd),
    budgetRepo.findAll(),
    budgetRepo.getSpentByCategory(start.getFullYear(), start.getMonth() + 1),
    taskRepo.countByStatus(),
  ]);

  const totalSpend = rangeTotals.expense;
  const totalIncome = rangeTotals.income;

  const categorySpendSorted = categorySpend.map((c) => ({
    ...c,
    color: categoryColors[c.category] ?? '#6B7280',
  }));

  // Weekly trend — relabel
  const weeklyTrendLabeled: WeeklyTrendItem[] = weeklyTrend.map((w, i) => ({
    week: `W${i + 1}`,
    amount: w.amount,
  }));

  // Weekly category spend — group by week
  const weekMap = new Map<string, Map<string, number>>();
  for (const r of weeklyCatRows) {
    if (!weekMap.has(r.week)) weekMap.set(r.week, new Map());
    weekMap.get(r.week)!.set(r.category, r.amount);
  }
  const weekLabels = ['W-4', 'W-3', 'W-2', 'Last wk', 'This wk'];
  const weekKeys = Array.from(weekMap.keys()).sort();
  const weeklyCategorySpend: WeeklyCategorySpendItem[] = weekKeys.slice(-5).map((wk, i) => {
    const catMap = weekMap.get(wk)!;
    let total = 0;
    const categories = Array.from(catMap.entries())
      .map(([category, amount]) => {
        total += amount;
        return { category, amount, color: categoryColors[category] ?? '#6B7280' };
      })
      .sort((a, b) => b.amount - a.amount);
    return { week: `W${i + 1}`, label: weekLabels[i] ?? `W${i + 1}`, categories, total };
  });

  // Budget vs actual
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
  const tasksCompleted = taskCounts.completed;
  const tasksPending = taskCounts.pending;
  const totalTasks = tasksCompleted + tasksPending;
  const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

  // Category sparklines — use weekly category data already fetched
  const catTotals = new Map<string, { total: number; weeklyAmounts: number[]; topMerchant: string | null }>();
  for (const c of categorySpendSorted) {
    catTotals.set(c.category, { total: c.amount, weeklyAmounts: [0, 0, 0, 0], topMerchant: null });
  }
  const recentWeekKeys = weekKeys.slice(-4);
  for (let wi = 0; wi < recentWeekKeys.length; wi++) {
    const catMap = weekMap.get(recentWeekKeys[wi]);
    if (!catMap) continue;
    for (const [cat, amt] of catMap) {
      const entry = catTotals.get(cat);
      if (entry) entry.weeklyAmounts[wi] = amt;
    }
  }
  // Top merchant per category from the top merchants list (approximation)
  for (const m of topMerchants) {
    for (const [cat, entry] of catTotals) {
      if (!entry.topMerchant) entry.topMerchant = m.merchant;
    }
  }
  const categorySparklines: CategorySparklineItem[] = Array.from(catTotals.entries())
    .map(([category, { total, weeklyAmounts, topMerchant }]) => ({
      category,
      color: categoryColors[category] ?? '#6B7280',
      total,
      pctOfTotal: totalSpend > 0 ? (total / totalSpend) * 100 : 0,
      weeklyAmounts,
      topMerchant,
    }))
    .sort((a, b) => b.total - a.total);

  // Insights
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

  return {
    totalSpend,
    totalIncome,
    net: totalIncome - totalSpend,
    averageTransaction,
    weeklyTrend: weeklyTrendLabeled,
    weeklyCategorySpend,
    monthlyTrend,
    budgetVsActual,
    topMerchants,
    insights,
    productivity: { tasksCompleted, tasksPending, completionRate },
    currentMonthSpend,
    prevMonthSpend,
    categorySparklines,
    feesData,
  };
}
