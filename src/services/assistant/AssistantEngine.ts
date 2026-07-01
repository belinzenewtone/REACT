import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { formatCurrency } from '../../utils/formatters';

export interface AssistantResponse {
  content: string;
  actions?: string[];
}

export class AssistantEngine {
  private txRepo: TransactionRepository;
  private taskRepo: TaskRepository;
  private budgetRepo: BudgetRepository;

  constructor(db: SQLiteDatabase) {
    this.txRepo = new TransactionRepository(db);
    this.taskRepo = new TaskRepository(db);
    this.budgetRepo = new BudgetRepository(db);
  }

  async process(message: string): Promise<AssistantResponse> {
    const text = message.toLowerCase();

    if (this.matches(text, ['spend', 'spent', 'expense', 'expenses'])) {
      return this.getSpendingSummary();
    }

    if (this.matches(text, ['income', 'earned', 'received', 'salary'])) {
      return this.getIncomeSummary();
    }

    if (this.matches(text, ['balance', 'net', 'left', 'remaining'])) {
      return this.getBalanceSummary();
    }

    if (this.matches(text, ['budget', 'budgets', 'over budget'])) {
      return this.getBudgetSummary();
    }

    if (this.matches(text, ['task', 'tasks', 'todo', 'to do', 'pending'])) {
      return this.getTasksSummary();
    }

    if (this.matches(text, ['transaction', 'transactions', 'recent'])) {
      return this.getRecentTransactions();
    }

    if (this.matches(text, ['hello', 'hi', 'hey'])) {
      return { content: 'Hello! I can help you check your spending, income, budgets, tasks, and recent transactions. What would you like to know?' };
    }

    return {
      content: "I'm not sure I understood. Try asking about your spending, income, balance, budgets, tasks, or recent transactions.",
      actions: ['Show spending', 'Show income', 'Show budgets', 'Show tasks'],
    };
  }

  private matches(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private async getSpendingSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const totals = await this.txRepo.getMonthlyTotals(year, month);
    const categoryTotals = await this.txRepo.getCategoryTotals(year, month, 'expense');

    const topCategory = categoryTotals[0];
    const topCategoryText = topCategory
      ? `Your biggest expense category is ${topCategory.category} at ${formatCurrency(topCategory.total)}.`
      : '';

    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const lastTotals = await this.txRepo.getMonthlyTotals(lastMonthYear, lastMonth);

    let comparisonText = '';
    if (lastTotals.expense > 0) {
      const change = ((totals.expense - lastTotals.expense) / lastTotals.expense) * 100;
      const direction = change >= 0 ? 'up' : 'down';
      comparisonText = ` That's ${Math.abs(change).toFixed(1)}% ${direction} from last month.`;
    }

    return {
      content: `You have spent ${formatCurrency(totals.expense)} this month.${comparisonText} ${topCategoryText}`,
      actions: ['View transactions', 'View budgets'],
    };
  }

  private async getIncomeSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const totals = await this.txRepo.getMonthlyTotals(now.getUTCFullYear(), now.getUTCMonth() + 1);

    return {
      content: `Your income this month is ${formatCurrency(totals.income)}.`,
      actions: ['View transactions', 'View dashboard'],
    };
  }

  private async getBalanceSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const totals = await this.txRepo.getMonthlyTotals(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const net = totals.income - totals.expense;

    return {
      content: `Your net balance for this month is ${formatCurrency(net)} (income ${formatCurrency(totals.income)} minus expenses ${formatCurrency(totals.expense)}).`,
      actions: ['View dashboard', 'View transactions'],
    };
  }

  private async getBudgetSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const budgets = await this.budgetRepo.findAll();
    const spent = await this.budgetRepo.getSpentByCategory(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const spentMap = new Map(spent.map((s) => [s.category, s.spent]));

    if (budgets.length === 0) {
      return { content: "You haven't set up any budgets yet. Go to Planner > Budgets to create one." };
    }

    const overBudget = budgets
      .map((b) => ({
        category: b.category,
        limit: b.limit_amount,
        spent: spentMap.get(b.category) ?? 0,
      }))
      .filter((b) => b.spent > b.limit);

    if (overBudget.length > 0) {
      const list = overBudget
        .map((b) => `${b.category} (${formatCurrency(b.spent)} / ${formatCurrency(b.limit)})`)
        .join(', ');
      return {
        content: `You're over budget in: ${list}.`,
        actions: ['View budgets'],
      };
    }

    return {
      content: `You're within budget across all ${budgets.length} categories.`,
      actions: ['View budgets'],
    };
  }

  private async getTasksSummary(): Promise<AssistantResponse> {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const tasks = await this.taskRepo.findAll({
      status: 'active',
      dueBefore: in7Days.toISOString(),
      limit: 100,
    });

    const highPriority = tasks.filter((t) => t.priority === 'high').length;

    return {
      content: `You have ${tasks.length} active tasks due in the next 7 days${highPriority > 0 ? `, including ${highPriority} high priority` : ''}.`,
      actions: ['View tasks', 'Add task'],
    };
  }

  private async getRecentTransactions(): Promise<AssistantResponse> {
    const txs = await this.txRepo.findAll({ limit: 5, orderBy: 'date_desc' });

    if (txs.length === 0) {
      return { content: 'No recent transactions found.' };
    }

    const list = txs
      .map((t) => `${t.merchant} (${formatCurrency(t.amount)})`)
      .join(', ');

    return {
      content: `Your recent transactions: ${list}.`,
      actions: ['View all transactions'],
    };
  }
}
