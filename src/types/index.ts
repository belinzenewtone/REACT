/**
 * Core domain models ported from the Kotlin LifeOS app.
 * These mirror the SQLDelight schemas and domain models in the shared module.
 */

export type SyncState = 'pending' | 'synced' | 'conflict' | 'error';
export type RecordSource = 'manual' | 'sms' | 'csv' | 'recurring' | 'import';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string; // ISO-8601
  source: string;
  transactionType: TransactionType;
  mpesaCode?: string;
  sourceHash?: string;
  rawSms?: string;
  description?: string;
  notes?: string;
  balanceAfter?: number;
  fee?: number;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
  inferredCategory?: boolean;
  inferenceSource?: string;
  semanticHash?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'active' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string;
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  reminderOffsets?: number[]; // minutes before deadline
  alarmEnabled: boolean;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
  timeSpentSeconds?: number;
}

export type EventType = 'event' | 'birthday' | 'anniversary' | 'countdown';
export type EventKind = 'meeting' | 'reminder' | 'task' | 'goal' | 'other';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO-8601 start datetime
  endDate?: string;
  type: EventType;
  kind: EventKind;
  importance: TaskPriority;
  status: TaskStatus;
  hasReminder: boolean;
  reminderMinutesBefore?: number;
  reminderOffsets?: number[];
  reminderTimeOfDayMinutes?: number;
  allDay: boolean;
  repeatRule: RepeatRule;
  repeatEndDate?: string;
  location?: string;
  guests?: string[];
  timeZoneId: string;
  alarmEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  period: BudgetPeriod;
  alertThreshold?: number; // 0-1
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remainingAmount: number;
  usagePercent: number; // 0-100
  status: 'under' | 'approaching' | 'over';
}

export type IncomeFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IncomeRecord {
  id: string;
  amount: number;
  source: string;
  date: string;
  note?: string;
  isRecurring: boolean;
  frequency?: IncomeFrequency;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
}

export type RecurringCadence = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  title: string;
  type: 'expense' | 'income' | 'task';
  cadence: RecurringCadence;
  nextRunAt: string;
  amount?: number;
  category?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
}

export interface Bill {
  id: string;
  userId?: string;
  title: string;
  amount: number;
  cycle: RecurringCadence;
  nextDueDate: string;
  lastPaidAt?: string;
  notes?: string;
  isActive: boolean;
  paidStatus: boolean;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  deletedAt?: string;
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  category?: string;
  deadline?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  deletedAt?: string;
  revision: number;
}

export interface FulizaLoan {
  id: string;
  drawCode?: string;
  drawAmountKes: number;
  totalRepaidKes: number;
  status: 'active' | 'repaid' | 'defaulted';
  drawDate: string;
  lastRepaymentDate?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface MerchantCategory {
  id: string;
  merchant: string;
  category: string;
  confidence: number;
  userCorrected: boolean;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  recordSource: RecordSource;
  deletedAt?: string;
  revision: number;
  userId?: string;
}

export interface PaybillRegistry {
  paybillNumber: string;
  displayName: string;
  lastSeenAt: string;
  usageCount: number;
  lastAmountKes?: number;
  userId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  avatarUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  decimalPrecision: number;
  notificationsEnabled: boolean;
  notificationTypes: Record<string, boolean>;
  biometricLock: boolean;
  lockTimeoutMinutes: number;
  defaultTransactionCategory: string;
  fulizaLimit: number;
  hapticFeedback: boolean;
  screenLockEnabled: boolean;
  pinCode: string;
  fingerprintEnabled: boolean;
  faceUnlockEnabled: boolean;
  assistantQuickSuggestions: boolean;
  budgetThresholdAlerts: boolean;
  alertThresholds: { high: number; medium: number; low: number };
  dailyDigestMorningSummary: boolean;
  dailyDigestDeliveryTime: string;
  appUpdates: boolean;
}

export interface ParsedSmsResult {
  code: string;
  type: string;
  counterparty: string;
  amount: number;
  balanceAfter?: number;
  date: string;
  confidence: number;
  category?: string;
  fee?: number;
  description?: string;
}
