import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from './repositories/TransactionRepository';
import { TaskRepository } from './repositories/TaskRepository';
import { BudgetRepository } from './repositories/BudgetRepository';
import { EventRepository } from './repositories/EventRepository';

/**
 * Seed sample data if the database is empty.
 * This is useful for development/demo; remove before production.
 */
export async function seedDatabaseIfEmpty(db: SQLiteDatabase): Promise<void> {
  const txRepo = new TransactionRepository(db);
  const existing = await txRepo.findAll({ limit: 1 });
  if (existing.length > 0) return;

  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;

  const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();
  const makeDate = (day: number, hour = 12) =>
    new Date(Date.UTC(thisYear, thisMonth - 1, day, hour)).toISOString();

  // Sample transactions
  const sampleTransactions = [
    { amount: 2500, merchant: 'Java House', category: 'food', day: 2, hour: 9, type: 'expense' as const },
    { amount: 500, merchant: 'Safaricom Airtime', category: 'airtime', day: 3, hour: 14, type: 'expense' as const },
    { amount: 12000, merchant: 'Uber', category: 'transport', day: 5, hour: 8, type: 'expense' as const },
    { amount: 45000, merchant: 'Monthly Rent', category: 'rent', day: 1, hour: 10, type: 'expense' as const },
    { amount: 8000, merchant: 'Naivas Supermarket', category: 'groceries', day: 7, hour: 16, type: 'expense' as const },
    { amount: 150000, merchant: 'Salary', category: 'income', day: 25, hour: 9, type: 'income' as const },
    { amount: 3000, merchant: 'KPLC Tokens', category: 'utilities', day: 10, hour: 11, type: 'expense' as const },
    { amount: 2500, merchant: 'Netflix', category: 'entertainment', day: 12, hour: 20, type: 'expense' as const },
  ];

  for (const t of sampleTransactions) {
    await txRepo.create({
      amount: t.amount,
      merchant: t.merchant,
      category: t.category,
      date: makeDate(t.day, t.hour),
      source: 'manual',
      transactionType: t.type,
      status: 'completed',
      recordSource: 'manual',
    });
  }

  // Sample budgets
  const budgetRepo = new BudgetRepository(db);
  const sampleBudgets = [
    { category: 'food', limitAmount: 15000, period: 'monthly' as const },
    { category: 'transport', limitAmount: 20000, period: 'monthly' as const },
    { category: 'utilities', limitAmount: 8000, period: 'monthly' as const },
    { category: 'entertainment', limitAmount: 5000, period: 'monthly' as const },
  ];

  for (const b of sampleBudgets) {
    await budgetRepo.create({
      category: b.category,
      limitAmount: b.limitAmount,
      period: b.period,
      alertThreshold: 0.8,
      recordSource: 'manual',
    });
  }

  // Sample tasks
  const taskRepo = new TaskRepository(db);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await taskRepo.create({
    title: 'Pay electricity bill',
    description: 'KPLC tokens due',
    priority: 'high',
    deadline: tomorrow.toISOString(),
    status: 'active',
    alarmEnabled: false,
    recordSource: 'manual',
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);
  nextWeek.setHours(14, 0, 0, 0);

  await taskRepo.create({
    title: 'Grocery shopping',
    priority: 'medium',
    deadline: nextWeek.toISOString(),
    status: 'active',
    alarmEnabled: false,
    recordSource: 'manual',
  });

  // Sample events
  const eventRepo = new EventRepository(db);

  const eventTomorrow = new Date();
  eventTomorrow.setDate(eventTomorrow.getDate() + 1);
  eventTomorrow.setHours(14, 0, 0, 0);

  await eventRepo.create({
    title: 'Team sync meeting',
    description: 'Weekly standup',
    date: eventTomorrow.toISOString(),
    type: 'event',
    kind: 'meeting',
    importance: 'medium',
    status: 'active',
    hasReminder: true,
    reminderMinutesBefore: 15,
    allDay: false,
    repeatRule: 'none',
    timeZoneId: 'UTC',
    alarmEnabled: true,
    recordSource: 'manual',
  });

  const eventWeekend = new Date();
  eventWeekend.setDate(eventWeekend.getDate() + (6 - eventWeekend.getDay()));
  eventWeekend.setHours(18, 0, 0, 0);

  await eventRepo.create({
    title: 'Dinner with family',
    date: eventWeekend.toISOString(),
    type: 'event',
    kind: 'reminder',
    importance: 'low',
    status: 'active',
    hasReminder: false,
    allDay: false,
    repeatRule: 'none',
    timeZoneId: 'UTC',
    alarmEnabled: false,
    recordSource: 'manual',
  });
}
