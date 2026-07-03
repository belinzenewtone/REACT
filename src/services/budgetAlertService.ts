import type { SQLiteDatabase } from 'expo-sqlite';
import { useAppStore } from '../store';
import { BudgetRepository, type BudgetRecord } from '../database/repositories/BudgetRepository';
import { fireBudgetAlert } from './notificationService';

function currentYearMonth(): string {
  const now = new Date();
  // Use local wall-clock month so budget alerts align with the user's calendar
  // and the local datetime strings stored for SMS-imported transactions.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shouldCheck(): boolean {
  const { settings } = useAppStore.getState();
  return (
    settings.notificationsEnabled &&
    settings.budgetThresholdAlerts &&
    settings.notificationTypes?.budgetAlerts !== false
  );
}

async function evaluateBudgetThreshold(
  budget: BudgetRecord,
  spent: number,
  yearMonth: string = currentYearMonth()
): Promise<void> {
  const { settings, firedBudgetAlerts, markBudgetAlertFired } = useAppStore.getState();
  const thresholds = settings.alertThresholds;
  const pct = Math.round((spent / budget.limit_amount) * 100);
  const category = budget.category;

  // ── Per-budget custom threshold (from Budget form's "Alert threshold" field) ──
  // Fires independently of the three global levels; keyed as `custom` so it
  // doesn't collide with high/medium/low. Applies only when the budget row
  // explicitly stores a positive `alert_threshold` value.
  const customPct = budget.alert_threshold ?? null;
  if (customPct != null && customPct > 0 && pct >= customPct) {
    const customKey = `${category}|custom|${yearMonth}`;
    if (!firedBudgetAlerts[customKey]) {
      await fireBudgetAlert(category, spent, budget.limit_amount, customPct, 'high', yearMonth);
      markBudgetAlertFired(customKey);
    }
  }

  // ── Global 3-level alert (unchanged) ──
  let highestLevel: 'high' | 'medium' | 'low' | null = null;
  for (const level of ['high', 'medium', 'low'] as const) {
    if (pct >= thresholds[level]) {
      highestLevel = level;
      break;
    }
  }
  if (!highestLevel) return;

  const highestKey = `${category}|${highestLevel}|${yearMonth}`;
  if (firedBudgetAlerts[highestKey]) return;

  await fireBudgetAlert(category, spent, budget.limit_amount, thresholds[highestLevel], highestLevel, yearMonth);

  // Mark this level — and all lower levels — as fired so a single category
  // only notifies once per month even if spending fluctuates.
  for (const level of ['high', 'medium', 'low'] as const) {
    if (thresholds[level] <= thresholds[highestLevel]) {
      markBudgetAlertFired(`${category}|${level}|${yearMonth}`);
    }
  }
}

export async function checkBudgetThresholds(
  db: SQLiteDatabase,
  category: string,
  yearMonth: string = currentYearMonth()
): Promise<void> {
  if (!shouldCheck()) return;
  if (!category) return;

  try {
    const budgetRepo = new BudgetRepository(db);
    const budget = await budgetRepo.findByCategory(category);
    if (!budget || budget.is_active !== 1) return;

    const [year, month] = yearMonth.split('-').map(Number);
    const rows = await budgetRepo.getSpentByCategory(year, month);
    const row = rows.find((r) => r.category.toLowerCase() === category.toLowerCase());
    const spent = row?.spent ?? 0;

    await evaluateBudgetThreshold(budget, spent, yearMonth);
  } catch (error) {
    console.warn('Budget alert check failed:', error);
  }
}

export async function checkAllBudgetThresholds(
  db: SQLiteDatabase,
  yearMonth: string = currentYearMonth()
): Promise<void> {
  if (!shouldCheck()) return;
  try {
    const budgetRepo = new BudgetRepository(db);
    const now = new Date();
    const budgets = await budgetRepo.findAllActive();
    const spent = await budgetRepo.getSpentByCategory(now.getFullYear(), now.getMonth() + 1);
    const spentMap = new Map(spent.map((s) => [s.category.toLowerCase(), s.spent]));
    for (const budget of budgets) {
      const spentAmount = spentMap.get(budget.category.toLowerCase()) ?? 0;
      await evaluateBudgetThreshold(budget, spentAmount, yearMonth);
    }
  } catch (error) {
    console.warn('All-budget alert check failed:', error);
  }
}
