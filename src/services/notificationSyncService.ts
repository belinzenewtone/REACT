import type { SQLiteDatabase } from 'expo-sqlite';
import { useAppStore } from '../store';
import {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
  createNotificationChannel,
  scheduleDailyDigest,
  cancelDailyDigest,
  scheduleTaskReminders,
  cancelTaskReminders,
  scheduleEventReminders,
  cancelEventReminders,
  scheduleRecurringReminder,
  cancelRecurringReminder,
  scheduleBillReminder,
  cancelBillReminder,
  cancelByPrefix,
} from './notificationService';
import { TaskRepository } from '../database/repositories/TaskRepository';
import { EventRepository } from '../database/repositories/EventRepository';
import { RecurringRuleRepository } from '../database/repositories/RecurringRuleRepository';
import { BillRepository } from '../database/repositories/BillRepository';

function parseJsonOffsets(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((n) => typeof n === 'number');
  } catch {
    // ignore
  }
  return [];
}

/**
 * For repeating events (birthday/anniversary/yearly), roll the base ISO date
 * forward to the next occurrence AFTER "now" so `scheduleEventReminders`
 * schedules a future notification. Without this, a yearly event whose base
 * date has passed would never re-fire.
 *
 * Respects `repeat_end_date` — if the series has already ended, returns the
 * original base ISO so the caller's `fireMs <= now` guard skips scheduling.
 */
function nextOccurrenceISO(
  baseIso: string,
  rule: string,
  repeatEndIso?: string | null,
): string {
  const base = new Date(baseIso);
  if (isNaN(base.getTime()) || rule === 'none') return baseIso;
  const now = Date.now();
  const endMs = repeatEndIso ? new Date(repeatEndIso).getTime() : Number.POSITIVE_INFINITY;
  if (now > endMs) return baseIso; // series ended — don't roll forward
  const HARD_CAP = 400;
  let cursor = new Date(base);
  for (let i = 0; i < HARD_CAP; i++) {
    if (cursor.getTime() > now) {
      return cursor.getTime() > endMs ? baseIso : cursor.toISOString();
    }
    switch (rule) {
      case 'daily':   cursor.setUTCDate(cursor.getUTCDate() + 1); break;
      case 'weekly':  cursor.setUTCDate(cursor.getUTCDate() + 7); break;
      case 'monthly': cursor.setUTCMonth(cursor.getUTCMonth() + 1); break;
      case 'yearly':  cursor.setUTCFullYear(cursor.getUTCFullYear() + 1); break;
      default:        return baseIso;
    }
  }
  return baseIso;
}

function getSettings() {
  return useAppStore.getState().settings;
}

/**
 * User-initiated permission request. Fires the OS permission dialog.
 * Should be called ONLY from explicit user actions (onboarding "Allow"
 * button, Settings toggle, etc.) — never at app startup.
 */
export async function syncNotificationPermissions(): Promise<boolean> {
  await createNotificationChannel();
  const granted = await requestNotificationPermissions();
  useAppStore.setState((state) => ({
    settings: { ...state.settings, notificationsEnabled: granted },
  }));
  return granted;
}

/**
 * Passive permission check for app bootstrap. Never triggers a dialog.
 * Reconciles the persisted `notificationsEnabled` setting with the actual
 * OS permission state — e.g. if the user revoked permission from OS
 * settings while the app was closed.
 */
export async function reconcilePermissionState(): Promise<boolean> {
  await createNotificationChannel();
  const granted = await getNotificationPermissionStatus();
  const stored = useAppStore.getState().settings.notificationsEnabled;
  if (stored !== granted) {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, notificationsEnabled: granted },
    }));
  }
  return granted;
}

export async function syncDailyDigest(): Promise<void> {
  const settings = getSettings();
  const enabled =
    settings.notificationsEnabled &&
    settings.dailyDigestMorningSummary &&
    settings.notificationTypes.dailyDigest !== false;
  if (enabled) {
    await scheduleDailyDigest(settings.dailyDigestDeliveryTime);
  } else {
    await cancelDailyDigest();
  }
}

export async function syncTaskReminders(
  db: SQLiteDatabase,
  taskId?: string
): Promise<void> {
  const settings = getSettings();
  const remindersEnabled =
    settings.notificationsEnabled && settings.notificationTypes.reminders !== false;

  if (!remindersEnabled) {
    if (taskId) {
      await cancelTaskReminders(taskId);
    } else {
      await cancelByPrefix('task-');
    }
    return;
  }

  if (taskId) {
    const repo = new TaskRepository(db);
    const task = await repo.findById(taskId);
    if (task && task.status === 'active' && task.deadline) {
      const offsets = parseJsonOffsets(task.reminder_offsets);
      if (offsets.length > 0) {
        await scheduleTaskReminders(
          task.id,
          task.title,
          task.deadline,
          offsets,
          task.alarm_enabled === 1
        );
        return;
      }
    }
    await cancelTaskReminders(taskId);
    return;
  }

  // Reconcile all active tasks
  const repo = new TaskRepository(db);
  const tasks = await repo.findAll({ status: 'active' });
  await Promise.all(tasks.map((t) => syncTaskReminders(db, t.id)));
}

export async function syncEventReminders(
  db: SQLiteDatabase,
  eventId?: string
): Promise<void> {
  const settings = getSettings();
  const remindersEnabled =
    settings.notificationsEnabled && settings.notificationTypes.reminders !== false;

  if (!remindersEnabled) {
    if (eventId) {
      await cancelEventReminders(eventId);
    } else {
      await cancelByPrefix('event-');
    }
    return;
  }

  if (eventId) {
    const repo = new EventRepository(db);
    const event = await repo.findById(eventId);
    if (event && event.status !== 'completed') {
      const offsets = parseJsonOffsets(event.reminder_offsets);
      const hasCountdownTime = event.type === 'countdown' && event.reminder_time_of_day_minutes != null;
      // Roll yearly / repeating events forward so the base date is always in the future.
      const effectiveDate = nextOccurrenceISO(
        event.date,
        event.repeat_rule ?? 'none',
        event.repeat_end_date,
      );
      if (offsets.length > 0 || hasCountdownTime) {
        await scheduleEventReminders(
          event.id,
          event.title,
          effectiveDate,
          offsets,
          event.alarm_enabled === 1,
          event.type,
          event.reminder_time_of_day_minutes ?? undefined,
          event.time_zone_id,
        );
        return;
      }
    }
    await cancelEventReminders(eventId);
    return;
  }

  // Reconcile all events
  const repo = new EventRepository(db);
  const events = await repo.findAll();
  await Promise.all(events.map((e) => syncEventReminders(db, e.id)));
}

export async function syncRecurringReminders(
  db: SQLiteDatabase,
  ruleId?: string
): Promise<void> {
  const settings = getSettings();
  const remindersEnabled =
    settings.notificationsEnabled && settings.notificationTypes.reminders !== false;

  if (!remindersEnabled) {
    if (ruleId) {
      await cancelRecurringReminder(ruleId);
    } else {
      await cancelByPrefix('recurring-');
    }
    return;
  }

  const repo = new RecurringRuleRepository(db);
  const rules = await repo.findAll();

  if (ruleId) {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.enabled !== 1) {
      await cancelRecurringReminder(ruleId);
      return;
    }
    await scheduleRecurringReminder(rule.id, rule.title, rule.next_run_at, rule.amount);
    return;
  }

  // Reconcile every enabled rule; cancel disabled ones.
  await cancelByPrefix('recurring-');
  await Promise.all(
    rules
      .filter((r) => r.enabled === 1)
      .map((r) => scheduleRecurringReminder(r.id, r.title, r.next_run_at, r.amount))
  );
}

export async function syncBillReminders(
  db: SQLiteDatabase,
  billId?: string
): Promise<void> {
  const settings = getSettings();
  const remindersEnabled =
    settings.notificationsEnabled && settings.notificationTypes?.reminders !== false;

  if (!remindersEnabled) {
    if (billId) {
      await cancelBillReminder(billId);
    } else {
      await cancelByPrefix('bill-');
    }
    return;
  }

  const repo = new BillRepository(db);
  const bills = await repo.findAll();

  if (billId) {
    const bill = bills.find((b) => b.id === billId);
    if (!bill || bill.is_active !== 1 || bill.paid_status === 1) {
      await cancelBillReminder(billId);
      return;
    }
    await scheduleBillReminder(bill.id, bill.title, bill.next_due_date, bill.amount);
    return;
  }

  await cancelByPrefix('bill-');
  await Promise.all(
    bills
      .filter((b) => b.is_active === 1 && b.paid_status !== 1)
      .map((b) => scheduleBillReminder(b.id, b.title, b.next_due_date, b.amount))
  );
}

export async function syncAllNotifications(db: SQLiteDatabase): Promise<void> {
  await syncDailyDigest();
  await syncTaskReminders(db);
  await syncEventReminders(db);
  await syncRecurringReminders(db);
  await syncBillReminders(db);
}

export async function cancelAllNotifications(): Promise<void> {
  await cancelDailyDigest();
  await cancelByPrefix('task-');
  await cancelByPrefix('event-');
  await cancelByPrefix('recurring-');
  await cancelByPrefix('bill-');
  await cancelByPrefix('txn-');
  await cancelByPrefix('budget-');
}
