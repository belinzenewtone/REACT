import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { GoalRepository } from '../../database/repositories/GoalRepository';
import { IncomeRepository } from '../../database/repositories/IncomeRepository';
import { BillRepository } from '../../database/repositories/BillRepository';
import { FulizaLoanRepository } from '../../database/repositories/FulizaLoanRepository';
import { EventRepository } from '../../database/repositories/EventRepository';
import { formatCurrency } from '../../utils/formatters';

export interface AssistantResponse {
  content: string;
  actions?: string[];
}

interface Period {
  label: string;
  startMs: number;
  endMs: number;
  year: number;
  month: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['food', 'restaurant', 'eating', 'eat out', 'lunch', 'dinner', 'breakfast', 'kfc', 'java', 'burger', 'pizza', 'meal', 'snack', 'cafe', 'coffee'],
  groceries: ['groceries', 'grocery', 'naivas', 'carrefour', 'quickmart', 'supermarket', 'shop', 'market'],
  transport: ['transport', 'uber', 'bolt', 'fare', 'taxi', 'matatu', 'bus', 'petrol', 'fuel', 'boda', 'commute', 'trip', 'ride'],
  airtime: ['airtime', 'bundles', 'data bundle', 'safaricom', 'airtel', 'telkom', 'credit'],
  utilities: ['utilities', 'electricity', 'kplc', 'water', 'internet', 'wifi', 'power'],
  entertainment: ['entertainment', 'dstv', 'zuku', 'cinema', 'movies', 'film', 'fun', 'game', 'club', 'bar'],
  health: ['health', 'hospital', 'pharmacy', 'doctor', 'nhif', 'medicine', 'clinic', 'prescription', 'medical'],
  education: ['education', 'school', 'college', 'university', 'helb', 'fees', 'tuition', 'books'],
  housing: ['housing', 'rent', 'landlord', 'property', 'house', 'flat', 'apartment'],
  subscriptions: ['subscription', 'subscriptions', 'netflix', 'spotify', 'showmax', 'monthly plan'],
  shopping: ['shopping', 'clothes', 'shoes', 'fashion', 'mall', 'online', 'jumia', 'kilimall'],
};

export class AssistantEngine {
  private txRepo: TransactionRepository;
  private taskRepo: TaskRepository;
  private budgetRepo: BudgetRepository;
  private goalRepo: GoalRepository;
  private incomeRepo: IncomeRepository;
  private billRepo: BillRepository;
  private fulizaRepo: FulizaLoanRepository;
  private eventRepo: EventRepository;

  constructor(db: SQLiteDatabase) {
    this.txRepo = new TransactionRepository(db);
    this.taskRepo = new TaskRepository(db);
    this.budgetRepo = new BudgetRepository(db);
    this.goalRepo = new GoalRepository(db);
    this.incomeRepo = new IncomeRepository(db);
    this.billRepo = new BillRepository(db);
    this.fulizaRepo = new FulizaLoanRepository(db);
    this.eventRepo = new EventRepository(db);
  }

  async process(message: string): Promise<AssistantResponse> {
    const text = message.toLowerCase().trim();
    const period = this.extractPeriod(text);

    // Greetings
    if (this.any(text, ['hello', 'hi ', 'hey ', 'hi!', 'hey!', 'hola', 'good morning', 'good afternoon', 'good evening', 'habari', 'sasa', 'mambo'])) {
      return this.getGreeting();
    }

    // Help
    if (this.any(text, ['help', 'what can you', 'what do you', 'capabilities', 'commands', 'what can i ask', 'how do i', 'guide me'])) {
      return this.getHelp();
    }

    // Fuliza / debt
    if (this.any(text, ['fuliza', 'loan', 'owe', 'debt', 'borrow', 'borrowed', 'overdraft', 'outstanding loan', 'i owe'])) {
      return this.getFulizaSummary();
    }

    // Bills
    if (this.any(text, ['bill', 'bills', 'due soon', 'next payment', 'overdue', 'upcoming payment', 'what do i owe', 'recurring payment', 'when is my'])) {
      return this.getBillsSummary();
    }

    // Goals
    if (this.any(text, ['goal', 'goals', 'target', 'saving goal', 'savings goal', 'progress', 'how far', 'achievement', 'am i on track', 'how close'])) {
      return this.getGoalsSummary();
    }

    // Events / calendar
    if (this.any(text, ['event', 'events', 'calendar', 'appointment', 'schedule for', 'what is happening', "what's on", 'meeting', 'what do i have today'])) {
      return this.getEventsSummary(text, period);
    }

    // "today" alone or with event-flavoured context
    if (text === 'today' || (text.includes('today') && !this.any(text, ['spend', 'spent', 'expense', 'bought', 'paid', 'task', 'todo']))) {
      return this.getEventsSummary(text, period);
    }

    // Category-specific spending
    const matchedCategory = this.extractCategory(text);
    if (matchedCategory) {
      return this.getCategorySpending(matchedCategory, period);
    }

    // Spending / expenses
    if (this.any(text, ['spend', 'spent', 'expense', 'expenses', 'cost', 'costs', 'paid out', 'bought', 'how much did i', 'how much have i', 'what did i spend', 'total expenses', 'outgoings'])) {
      return this.getSpendingSummary(period);
    }

    // Income
    if (this.any(text, ['income', 'earned', 'how much came in', 'salary', 'earn', 'earnings', 'inflow', 'money in', 'how much received', 'what i received'])) {
      return this.getIncomeSummary(period);
    }

    // Balance / net
    if (this.any(text, ['balance', 'net', 'how much left', 'remaining', 'save', 'saved', 'saving', 'can i afford', 'financial health', 'how am i doing', 'am i saving', 'money left', 'surplus', 'deficit'])) {
      return this.getBalanceSummary(period);
    }

    // Budgets
    if (this.any(text, ['budget', 'budgets', 'over budget', 'limit', 'allowance', 'on budget', 'within budget', 'exceeded'])) {
      return this.getBudgetSummary();
    }

    // Tasks
    if (this.any(text, ['task', 'tasks', 'todo', 'to-do', 'to do', 'pending task', 'due task', 'overdue task', 'complete', 'unfinished', 'what should i do'])) {
      return this.getTasksSummary();
    }

    // Recent transactions
    if (this.any(text, ['transaction', 'transactions', 'recent', 'latest', 'last transaction', 'show me', 'list my', 'what did i buy'])) {
      return this.getRecentTransactions();
    }

    // Comparison / trends
    if (this.any(text, ['compare', 'vs ', 'versus', 'more than last', 'less than last', 'trend', 'increase', 'decrease', 'better or worse', 'compared to'])) {
      return this.getSpendingComparison();
    }

    // General overview / snapshot
    if (this.any(text, ['summary', 'overview', 'snapshot', 'dashboard', 'report', 'how are things', 'update me', 'what is my financial', 'financial situation'])) {
      return this.getFinancialSnapshot();
    }

    return {
      content: "I didn't quite catch that. You can ask about your spending, income, balance, budgets, goals, bills, tasks, or calendar.\n\nTry: \"How much did I spend this week?\" or \"What bills are due?\"",
      actions: ['How much did I spend this month?', 'What bills are due?', 'Show my goals', 'Show budgets'],
    };
  }

  // ─── Period extraction ────────────────────────────────────────────────────

  private extractPeriod(text: string): Period {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    if (text.includes('yesterday')) {
      const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      return { label: 'yesterday', startMs: d.getTime(), endMs: end.getTime(), year, month };
    }
    if (text.includes('today')) {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return { label: 'today', startMs: start.getTime(), endMs: now.getTime(), year, month };
    }
    if (this.any(text, ['this week', 'past week', 'last 7 days', 'last seven days', 'seven days', 'past 7'])) {
      const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      return { label: 'the past 7 days', startMs: start.getTime(), endMs: now.getTime(), year, month };
    }
    if (this.any(text, ['last week', 'previous week', 'week before'])) {
      const start = new Date(now); start.setDate(start.getDate() - 14); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setDate(end.getDate() - 7); end.setHours(23, 59, 59, 999);
      return { label: 'last week', startMs: start.getTime(), endMs: end.getTime(), year, month };
    }
    if (this.any(text, ['last month', 'previous month', 'month before'])) {
      const lm = month === 1 ? 12 : month - 1;
      const ly = month === 1 ? year - 1 : year;
      const start = new Date(Date.UTC(ly, lm - 1, 1));
      const end = new Date(Date.UTC(ly, lm, 0, 23, 59, 59, 999));
      return { label: 'last month', startMs: start.getTime(), endMs: end.getTime(), year: ly, month: lm };
    }
    if (this.any(text, ['last 30 days', 'past 30 days', 'thirty days', '30 days'])) {
      const start = new Date(now); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      return { label: 'the last 30 days', startMs: start.getTime(), endMs: now.getTime(), year, month };
    }
    if (this.any(text, ['this year', 'year to date', 'ytd', 'so far this year'])) {
      const start = new Date(Date.UTC(year, 0, 1));
      return { label: 'this year', startMs: start.getTime(), endMs: now.getTime(), year, month };
    }
    if (this.any(text, ['last year', 'previous year'])) {
      const start = new Date(Date.UTC(year - 1, 0, 1));
      const end = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
      return { label: 'last year', startMs: start.getTime(), endMs: end.getTime(), year: year - 1, month: 12 };
    }
    // Default: this month
    const start = new Date(Date.UTC(year, month - 1, 1));
    return { label: 'this month', startMs: start.getTime(), endMs: now.getTime(), year, month };
  }

  private extractCategory(text: string): string | null {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => text.includes(k))) return cat;
    }
    return null;
  }

  // ─── Intent handlers ──────────────────────────────────────────────────────

  private getGreeting(): AssistantResponse {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return {
      content: `${greet}! I can help with your M-Pesa spending, budgets, bills, goals, tasks, and calendar. What would you like to know?`,
      actions: ['How much did I spend this month?', 'What bills are due?', 'Show my goals', 'Show tasks'],
    };
  }

  private getHelp(): AssistantResponse {
    return {
      content: [
        "Here's what I can help with:\n",
        '💰 Spending — "How much did I spend this week?" · "Food this month"',
        '📥 Income — "What is my income this month?"',
        '⚖️ Balance — "What is my net balance?" · "Am I saving?"',
        '📊 Budgets — "Am I over budget?"',
        '🧾 Bills — "What bills are due?" · "Overdue bills"',
        '🎯 Goals — "How are my savings goals?"',
        '✅ Tasks — "What tasks are pending?"',
        '📅 Calendar — "What is on today?" · "Upcoming events"',
        '📉 Fuliza — "How much Fuliza do I owe?"\n',
        'Add time periods: "today", "this week", "last month", "this year".',
      ].join('\n'),
      actions: ['How much did I spend this month?', 'What bills are due?', 'Show my goals'],
    };
  }

  private async getSpendingSummary(period: Period): Promise<AssistantResponse> {
    const isRangePeriod = !['this month', 'last month', 'this year', 'last year'].includes(period.label);

    if (isRangePeriod) {
      return this.getSpendingForRange(period);
    }

    const [totals, categoryTotals] = await Promise.all([
      this.txRepo.getMonthlyTotals(period.year, period.month),
      this.txRepo.getCategoryTotals(period.year, period.month, 'expense'),
    ]);

    const lm = period.month === 1 ? 12 : period.month - 1;
    const ly = period.month === 1 ? period.year - 1 : period.year;
    const lastTotals = await this.txRepo.getMonthlyTotals(ly, lm);

    let comparisonText = '';
    if (lastTotals.expense > 0) {
      const change = ((totals.expense - lastTotals.expense) / lastTotals.expense) * 100;
      const dir = change >= 0 ? 'up' : 'down';
      comparisonText = ` That is ${Math.abs(change).toFixed(1)}% ${dir} from last month.`;
    }

    const top3 = categoryTotals.slice(0, 3)
      .map((c) => `${c.category} ${formatCurrency(c.total)}`)
      .join(' · ');
    const topText = top3 ? `\n\nTop categories: ${top3}.` : '';

    return {
      content: `You spent ${formatCurrency(totals.expense)} ${period.label}.${comparisonText}${topText}`,
      actions: ['View transactions', 'View budgets', 'Break down by category'],
    };
  }

  private async getSpendingForRange(period: Period): Promise<AssistantResponse> {
    const txs = await this.txRepo.findAll({ limit: 500, orderBy: 'date_desc' });
    const inRange = txs.filter((t) => {
      const ms = new Date(t.date).getTime();
      return ms >= period.startMs && ms <= period.endMs && (t.transaction_type === 'expense' || t.transaction_type === 'transfer' || t.transaction_type === 'fuliza');
    });

    if (inRange.length === 0) {
      return { content: `No expenses recorded ${period.label}.`, actions: ['View transactions'] };
    }

    const total = inRange.reduce((sum, t) => sum + t.amount, 0);
    const byCategory: Record<string, number> = {};
    for (const t of inRange) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    }
    const top3 = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat} ${formatCurrency(amt)}`)
      .join(' · ');

    return {
      content: `You spent ${formatCurrency(total)} ${period.label} across ${inRange.length} transaction${inRange.length !== 1 ? 's' : ''}.\n\nTop: ${top3 || 'no categories'}`,
      actions: ['View transactions', 'View budgets'],
    };
  }

  private async getCategorySpending(category: string, period: Period): Promise<AssistantResponse> {
    if (['this month', 'last month'].includes(period.label)) {
      const categoryTotals = await this.txRepo.getCategoryTotals(period.year, period.month, 'expense');
      const match = categoryTotals.find((c) => c.category.toLowerCase().includes(category));

      if (!match || match.total === 0) {
        return { content: `No ${category} spending recorded ${period.label}.`, actions: ['View all spending', 'View transactions'] };
      }

      const allExpense = categoryTotals.reduce((sum, c) => sum + c.total, 0);
      const pct = allExpense > 0 ? ((match.total / allExpense) * 100).toFixed(1) : '0';
      return {
        content: `You spent ${formatCurrency(match.total)} on ${category} ${period.label} — ${pct}% of total expenses.`,
        actions: ['View transactions', 'View budgets'],
      };
    }

    const txs = await this.txRepo.findAll({ limit: 500, orderBy: 'date_desc' });
    const inRange = txs.filter((t) => {
      const ms = new Date(t.date).getTime();
      return ms >= period.startMs && ms <= period.endMs && t.category.toLowerCase().includes(category);
    });

    if (inRange.length === 0) {
      return { content: `No ${category} spending ${period.label}.`, actions: ['View transactions'] };
    }

    const total = inRange.reduce((sum, t) => sum + t.amount, 0);
    return {
      content: `You spent ${formatCurrency(total)} on ${category} ${period.label} across ${inRange.length} transaction${inRange.length !== 1 ? 's' : ''}.`,
      actions: ['View transactions'],
    };
  }

  private async getIncomeSummary(period: Period): Promise<AssistantResponse> {
    const totals = await this.txRepo.getMonthlyTotals(period.year, period.month);
    const incomes = await this.incomeRepo.findAll();
    const periodIncomes = incomes.filter((i) => {
      const d = new Date(i.date).getTime();
      return d >= period.startMs && d <= period.endMs;
    });

    const sources = [...new Set(periodIncomes.map((i) => i.source))].slice(0, 3);
    const sourceText = sources.length > 0 ? `\n\nSources: ${sources.join(', ')}.` : '';

    return {
      content: `Income ${period.label}: ${formatCurrency(totals.income)}.${sourceText}`,
      actions: ['View transactions', 'View dashboard'],
    };
  }

  private async getBalanceSummary(period: Period): Promise<AssistantResponse> {
    const totals = await this.txRepo.getMonthlyTotals(period.year, period.month);
    const net = totals.income - totals.expense;
    const icon = net > 0 ? '✓' : '⚠';
    const status = net > 0
      ? `You are saving ${formatCurrency(net)} ${period.label}.`
      : `You are spending ${formatCurrency(Math.abs(net))} more than you earned ${period.label}.`;

    return {
      content: `${icon} ${status}\n\nIncome: ${formatCurrency(totals.income)}\nExpenses: ${formatCurrency(totals.expense)}\nNet: ${formatCurrency(net)}`,
      actions: ['View dashboard', 'View budgets', 'View transactions'],
    };
  }

  private async getBudgetSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const [budgets, spent] = await Promise.all([
      this.budgetRepo.findAll(),
      this.budgetRepo.getSpentByCategory(year, month),
    ]);

    if (budgets.length === 0) {
      return { content: "You have not set any budgets yet. Go to Planner to create one.", actions: ['View budgets'] };
    }

    const spentMap = new Map(spent.map((s) => [s.category, s.spent]));
    const withStatus = budgets.map((b) => ({
      category: b.category,
      limit: b.limit_amount,
      spent: spentMap.get(b.category) ?? 0,
    }));

    const over = withStatus.filter((b) => b.limit > 0 && b.spent > b.limit);
    const near = withStatus.filter((b) => b.limit > 0 && b.spent <= b.limit && b.spent / b.limit >= 0.8);
    const safe = withStatus.length - over.length - near.length;

    if (over.length > 0) {
      const overList = over.map((b) => `${b.category} (${formatCurrency(b.spent)} / ${formatCurrency(b.limit)})`).join(', ');
      const nearText = near.length > 0 ? `\n\nNearing limit: ${near.map((b) => `${b.category} ${Math.round((b.spent / b.limit) * 100)}%`).join(', ')}.` : '';
      const safeText = safe > 0 ? `\n${safe} other categor${safe > 1 ? 'ies' : 'y'} on track.` : '';
      return { content: `Over budget in: ${overList}.${nearText}${safeText}`, actions: ['View budgets'] };
    }

    if (near.length > 0) {
      const nearList = near.map((b) => `${b.category} ${Math.round((b.spent / b.limit) * 100)}%`).join(', ');
      return {
        content: `You are within budget, but getting close in: ${nearList}.\n${safe} other categor${safe > 1 ? 'ies are' : 'y is'} comfortably on track.`,
        actions: ['View budgets'],
      };
    }

    const totalBudgeted = withStatus.reduce((s, b) => s + b.limit, 0);
    const totalSpent = withStatus.reduce((s, b) => s + b.spent, 0);
    const pct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      content: `On track across all ${budgets.length} budget categories this month (${pct}% used: ${formatCurrency(totalSpent)} / ${formatCurrency(totalBudgeted)}).`,
      actions: ['View budgets'],
    };
  }

  private async getGoalsSummary(): Promise<AssistantResponse> {
    const goals = await this.goalRepo.findAll();
    const active = goals.filter((g) => g.status === 'active');
    const completed = goals.filter((g) => g.status === 'completed');

    if (active.length === 0 && completed.length === 0) {
      return { content: "You have no goals set yet. Go to Goals to create a savings target.", actions: ['View goals'] };
    }

    if (active.length === 0) {
      return { content: `All ${completed.length} goals completed!`, actions: ['View goals'] };
    }

    const lines = active.slice(0, 5).map((g) => {
      const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
      const filled = Math.round(pct / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      const deadline = g.deadline
        ? ` · due ${new Date(g.deadline).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}`
        : '';
      return `${g.title}\n  ${bar} ${pct}% — ${formatCurrency(g.current_value)} / ${formatCurrency(g.target_value)}${deadline}`;
    });

    const completedNote = completed.length > 0 ? `\n\n${completed.length} goal${completed.length > 1 ? 's' : ''} already completed!` : '';

    return {
      content: `Active goals (${active.length}):\n\n${lines.join('\n\n')}${completedNote}`,
      actions: ['View goals'],
    };
  }

  private async getBillsSummary(): Promise<AssistantResponse> {
    const bills = await this.billRepo.findAll();
    const active = bills.filter((b) => b.is_active);

    if (active.length === 0) {
      return { content: "No active bills set up. Go to Planner to add recurring payments.", actions: ['View bills'] };
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const overdue = active.filter((b) => new Date(b.next_due_date) < now && !b.paid_status);
    const dueSoon = active
      .filter((b) => { const d = new Date(b.next_due_date); return d >= now && d <= in7Days; })
      .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

    let text = '';
    if (overdue.length > 0) {
      text += `Overdue (${overdue.length}):\n${overdue.map((b) => `• ${b.title} — ${formatCurrency(b.amount)}`).join('\n')}\n\n`;
    }
    if (dueSoon.length > 0) {
      const list = dueSoon.map((b) => {
        const days = Math.round((new Date(b.next_due_date).getTime() - now.getTime()) / 86400000);
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
        return `• ${b.title} — ${formatCurrency(b.amount)} (${when})`;
      }).join('\n');
      text += `Due soon:\n${list}\n\n`;
    }
    if (overdue.length === 0 && dueSoon.length === 0) {
      text = 'No bills due in the next 7 days. ';
    }

    const totalMonthly = active.reduce((sum, b) => sum + b.amount, 0);
    text += `${active.length} active bills · ${formatCurrency(totalMonthly)} monthly.`;

    return { content: text.trim(), actions: ['View bills'] };
  }

  private async getFulizaSummary(): Promise<AssistantResponse> {
    const loans = await this.fulizaRepo.findAll();
    const active = loans.filter((l) => l.status === 'active');

    if (active.length === 0) {
      const repaid = loans.filter((l) => l.status === 'repaid');
      const note = repaid.length > 0 ? ` You have ${repaid.length} repaid Fuliza loan${repaid.length > 1 ? 's' : ''} in history.` : '';
      return { content: `No outstanding Fuliza loans — you are clear!${note}`, actions: ['View transactions'] };
    }

    const outstanding = active.reduce((sum, l) => sum + l.draw_amount_kes, 0);
    const repaid = active.reduce((sum, l) => sum + l.total_repaid_kes, 0);
    const lines = active.slice(0, 3).map((l) => {
      const date = new Date(l.draw_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      const code = l.draw_code ? ` (${l.draw_code})` : '';
      return `• ${formatCurrency(l.draw_amount_kes)} drawn on ${date}${code}`;
    });

    return {
      content: `${active.length} active Fuliza loan${active.length > 1 ? 's' : ''}:\n\nOutstanding: ${formatCurrency(outstanding)}\nRepaid so far: ${formatCurrency(repaid)}\n\n${lines.join('\n')}`,
      actions: ['View transactions'],
    };
  }

  private async getTasksSummary(): Promise<AssistantResponse> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tasks = await this.taskRepo.findAll({ status: 'active', dueBefore: in7Days.toISOString(), limit: 100 });

    if (tasks.length === 0) {
      return { content: "No tasks due in the next 7 days — you are all caught up!", actions: ['View tasks', 'Add task'] };
    }

    const high = tasks.filter((t) => t.priority === 'high');
    const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < now);
    const upcoming = tasks.slice(0, 4);

    let text = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} due in the next 7 days`;
    if (high.length > 0) text += `, ${high.length} high priority`;
    if (overdue.length > 0) text += `\n${overdue.length} already overdue`;
    text += '.';

    const list = upcoming.map((t) => {
      const due = t.deadline
        ? new Date(t.deadline).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
        : 'no date';
      return `• ${t.title} (${due})`;
    }).join('\n');

    text += `\n\n${list}`;
    if (tasks.length > 4) text += `\n…and ${tasks.length - 4} more.`;

    return { content: text, actions: ['View tasks', 'Add task'] };
  }

  private async getEventsSummary(text: string, period: Period): Promise<AssistantResponse> {
    const now = new Date();

    if (text.includes('today')) {
      const todayStr = now.toISOString().split('T')[0];
      const events = await this.eventRepo.findByDate(todayStr);
      if (events.length === 0) {
        return { content: "Nothing on your calendar today.", actions: ['View calendar'] };
      }
      const list = events.slice(0, 6).map((e) => {
        const time = e.all_day ? 'all day' : new Date(e.date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        return `• ${e.title} (${time})`;
      }).join('\n');
      return { content: `Today (${events.length} event${events.length !== 1 ? 's' : ''}):\n\n${list}`, actions: ['View calendar'] };
    }

    const endRange = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = await this.eventRepo.findInRange(now.toISOString(), endRange.toISOString());

    if (events.length === 0) {
      return { content: "No upcoming events in the next 7 days.", actions: ['View calendar'] };
    }

    const list = events.slice(0, 6).map((e) => {
      const date = new Date(e.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
      return `• ${e.title} (${date})`;
    }).join('\n');

    return { content: `Upcoming events (${events.length}):\n\n${list}`, actions: ['View calendar'] };
  }

  private async getRecentTransactions(): Promise<AssistantResponse> {
    const txs = await this.txRepo.findAll({ limit: 5, orderBy: 'date_desc' });

    if (txs.length === 0) {
      return { content: 'No transactions yet. Import your M-Pesa SMS to get started.', actions: ['Import SMS'] };
    }

    const list = txs.map((t) => {
      const date = new Date(t.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      const icon = t.transaction_type === 'income' ? '↑' : t.transaction_type === 'transfer' ? '↔' : '↓';
      return `${icon} ${t.merchant} — ${formatCurrency(t.amount)} (${date})`;
    }).join('\n');

    return { content: `Recent transactions:\n\n${list}`, actions: ['View all transactions'] };
  }

  private async getSpendingComparison(): Promise<AssistantResponse> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const lm = month === 1 ? 12 : month - 1;
    const ly = month === 1 ? year - 1 : year;

    const [current, last] = await Promise.all([
      this.txRepo.getMonthlyTotals(year, month),
      this.txRepo.getMonthlyTotals(ly, lm),
    ]);

    if (last.expense === 0) {
      return { content: `This month you have spent ${formatCurrency(current.expense)}. No data for last month to compare.` };
    }

    const expChange = ((current.expense - last.expense) / last.expense) * 100;
    const dir = expChange >= 0 ? 'more' : 'less';
    const icon = expChange >= 0 ? '📈' : '📉';

    let text = `${icon} Spending ${Math.abs(expChange).toFixed(1)}% ${dir} this month vs last:\n\nThis month: ${formatCurrency(current.expense)}\nLast month: ${formatCurrency(last.expense)}\nDifference: ${formatCurrency(Math.abs(current.expense - last.expense))}`;

    if (last.income > 0) {
      const incChange = ((current.income - last.income) / last.income) * 100;
      const incDir = incChange >= 0 ? 'up' : 'down';
      text += `\n\nIncome ${Math.abs(incChange).toFixed(1)}% ${incDir} (${formatCurrency(current.income)} vs ${formatCurrency(last.income)}).`;
    }

    return { content: text, actions: ['View budgets', 'View transactions'] };
  }

  private async getFinancialSnapshot(): Promise<AssistantResponse> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const [totals, budgets, spent, goals, bills, fulizaLoans] = await Promise.all([
      this.txRepo.getMonthlyTotals(year, month),
      this.budgetRepo.findAll(),
      this.budgetRepo.getSpentByCategory(year, month),
      this.goalRepo.findAll(),
      this.billRepo.findAll(),
      this.fulizaRepo.findAll(),
    ]);

    const net = totals.income - totals.expense;
    const spentMap = new Map(spent.map((s) => [s.category, s.spent]));
    const overBudget = budgets.filter((b) => b.limit_amount > 0 && (spentMap.get(b.category) ?? 0) > b.limit_amount).length;
    const activeGoals = goals.filter((g) => g.status === 'active').length;
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const activeBills = bills.filter((b) => b.is_active);
    const dueSoonCount = activeBills.filter((b) => new Date(b.next_due_date) <= in7).length;
    const activeFuliza = fulizaLoans.filter((l) => l.status === 'active');

    const lines = [
      `${net >= 0 ? '✓' : '⚠'} This month: income ${formatCurrency(totals.income)}, expenses ${formatCurrency(totals.expense)}, net ${formatCurrency(net)}`,
      budgets.length > 0
        ? overBudget > 0 ? `  ⚠ Over budget in ${overBudget} categor${overBudget > 1 ? 'ies' : 'y'}` : `  ✓ All ${budgets.length} budgets on track`
        : null,
      dueSoonCount > 0 ? `  ${dueSoonCount} bill${dueSoonCount > 1 ? 's' : ''} due in 7 days` : null,
      activeGoals > 0 ? `  ${activeGoals} active savings goal${activeGoals > 1 ? 's' : ''}` : null,
      activeFuliza.length > 0 ? `  ⚠ Fuliza outstanding: ${formatCurrency(activeFuliza.reduce((s, l) => s + l.draw_amount_kes, 0))}` : null,
    ].filter(Boolean);

    return {
      content: lines.join('\n'),
      actions: ['View budgets', 'What bills are due?', 'Show my goals', 'How much did I spend?'],
    };
  }

  private any(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }
}
