import { Platform } from 'react-native';
import { wallClockInZoneToUtcIso, deviceTimeZone } from '../utils/tz';

// expo-notifications requires a dev build (not Expo Go). All functions are
// wrapped in try/catch so the app runs normally in Expo Go — notifications
// simply won't fire there.

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Native module unavailable (Expo Go) — notifications are silently skipped
}

export const NOTIFICATION_CHANNEL_ID = 'lifeos-reminders';
const DAILY_DIGEST_ID = 'lifeos-daily-digest';

export async function createNotificationChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'LifeOS Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    await createNotificationChannel();
    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Passive permission check — never triggers the OS prompt. Used during app
 * bootstrap so we don't ambush the user with a permission dialog before
 * they've finished onboarding.
 */
export async function getNotificationPermissionStatus(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelByPrefix(prefix: string): Promise<void> {
  if (!Notifications) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications!.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

export async function scheduleTaskReminders(
  taskId: string,
  title: string,
  deadlineISO: string,
  reminderOffsets: number[],
  alarmEnabled: boolean,
): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelByPrefix(`task-${taskId}-`);
    const deadlineMs = new Date(deadlineISO).getTime();
    const now = Date.now();
    for (const offsetMin of reminderOffsets) {
      const fireMs = deadlineMs - offsetMin * 60_000;
      if (fireMs <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `task-${taskId}-${offsetMin}`,
        content: {
          title: `Task: ${title}`,
          body: offsetMin === 0 ? 'Due now' : `Due in ${describeDuration(offsetMin)}`,
          sound: alarmEnabled,
          data: { type: 'task', id: taskId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: NOTIFICATION_CHANNEL_ID,
          date: new Date(fireMs),
        },
      });
    }
  } catch {}
}

export async function cancelTaskReminders(taskId: string): Promise<void> {
  await cancelByPrefix(`task-${taskId}-`);
}

export async function scheduleEventReminders(
  eventId: string,
  title: string,
  eventDateISO: string,
  reminderOffsets: number[],
  alarmEnabled: boolean,
  eventType: string = 'event',
  reminderTimeOfDayMinutes?: number,
  timeZoneId?: string | null,
): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelByPrefix(`event-${eventId}-`);
    // Interpret the stored ISO as an absolute instant. Post-fix, the form
    // writes zone-correct ISO strings; legacy rows written in the device
    // zone still decode to the same wall-clock the user actually picked.
    const eventDate = new Date(eventDateISO);
    const eventMs = eventDate.getTime();
    const now = Date.now();
    const zone = timeZoneId?.trim() || deviceTimeZone();
    const emoji = eventType === 'birthday' ? '🎂' : eventType === 'anniversary' ? '💞' : '📅';

    for (const offsetMin of reminderOffsets) {
      let fireMs = eventMs - offsetMin * 60_000;

      // For countdown with a user-specified time of day, snap the fire time
      // to that clock time IN THE EVENT'S ZONE (not the device zone). e.g.
      // event zone Africa/Nairobi, time 09:00 → fires at 09:00 Nairobi even
      // if the user's phone has since moved to a different zone.
      if (eventType === 'countdown' && reminderTimeOfDayMinutes != null) {
        // Extract the target day using the event zone, then rebuild at
        // (h, m) in that same zone.
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour12: false,
        });
        const parts: Record<string, string> = {};
        for (const p of dtf.formatToParts(new Date(fireMs))) {
          if (p.type !== 'literal') parts[p.type] = p.value;
        }
        const h = Math.floor(reminderTimeOfDayMinutes / 60);
        const m = reminderTimeOfDayMinutes % 60;
        const snappedIso = wallClockInZoneToUtcIso(
          +parts.year, +parts.month, +parts.day, h, m, zone,
        );
        fireMs = new Date(snappedIso).getTime();
      }

      if (fireMs <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `event-${eventId}-${offsetMin}`,
        content: {
          title: `${emoji} ${title}`,
          body: offsetMin === 0 ? 'Today!' : `In ${describeDuration(offsetMin)}`,
          sound: alarmEnabled,
          data: { type: eventType, id: eventId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: NOTIFICATION_CHANNEL_ID,
          date: new Date(fireMs),
        },
      });
    }
  } catch {}
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  await cancelByPrefix(`event-${eventId}-`);
}

export async function scheduleDailyDigest(timeHHMM: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_ID).catch(() => {});
    const [h, m] = timeHHMM.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_DIGEST_ID,
      content: {
        title: 'Good morning ☀️',
        body: 'Your daily digest is ready — tasks, spending, and upcoming events.',
        data: { type: 'daily_digest' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: NOTIFICATION_CHANNEL_ID,
        hour: h,
        minute: m,
      },
    });
  } catch {}
}

export async function cancelDailyDigest(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_ID);
  } catch {}
}

export async function scheduleRecurringReminder(
  ruleId: string,
  title: string,
  nextRunIso: string,
  amountKes: number | null,
  alarmEnabled: boolean = false,
): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelByPrefix(`recurring-${ruleId}-`);
    const fireMs = new Date(nextRunIso).getTime();
    if (fireMs <= Date.now()) return;
    const amountLabel = amountKes != null ? ` (Ksh ${amountKes.toLocaleString('en-KE')})` : '';
    await Notifications.scheduleNotificationAsync({
      identifier: `recurring-${ruleId}-next`,
      content: {
        title: `Reminder: ${title}`,
        body: `Scheduled today${amountLabel}`,
        sound: alarmEnabled,
        data: { type: 'recurring', id: ruleId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: NOTIFICATION_CHANNEL_ID,
        date: new Date(fireMs),
      },
    });
  } catch {}
}

export async function cancelRecurringReminder(ruleId: string): Promise<void> {
  await cancelByPrefix(`recurring-${ruleId}-`);
}

/**
 * Schedule a "bill due today" heads-up. Fires on the morning of `nextDueDate`.
 * Cancels any previous bill reminder for the same billId first.
 */
export async function scheduleBillReminder(
  billId: string,
  title: string,
  nextDueDateIso: string,
  amountKes: number,
  alarmEnabled: boolean = false,
): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelByPrefix(`bill-${billId}-`);
    // Fire at 9am local on the due date.
    const due = new Date(nextDueDateIso);
    due.setHours(9, 0, 0, 0);
    if (due.getTime() <= Date.now()) return;
    const amt = amountKes.toLocaleString('en-KE', { maximumFractionDigits: 2 });
    await Notifications.scheduleNotificationAsync({
      identifier: `bill-${billId}-due`,
      content: {
        title: `Bill due: ${title}`,
        body: `Ksh ${amt} — due today`,
        sound: alarmEnabled,
        data: { type: 'bill', id: billId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: NOTIFICATION_CHANNEL_ID,
        date: due,
      },
    });
  } catch {}
}

export async function cancelBillReminder(billId: string): Promise<void> {
  await cancelByPrefix(`bill-${billId}-`);
}

/**
 * Heads-up notification when the SMS parser auto-imports a new transaction.
 * Gated by `settings.notificationsEnabled` (caller enforces).
 */
export async function fireNewTransactionAlert(
  mpesaCode: string,
  amountKes: number,
  merchant: string,
  transactionType: 'income' | 'expense' | 'transfer' | 'fuliza',
): Promise<void> {
  if (!Notifications) return;
  try {
    const verb = transactionType === 'income' ? 'Received' : 'Paid';
    const amt = amountKes.toLocaleString('en-KE', { maximumFractionDigits: 2 });
    await Notifications.scheduleNotificationAsync({
      identifier: `txn-${mpesaCode}`,
      content: {
        title: `${verb} Ksh ${amt}`,
        body: merchant,
        data: { type: 'transaction', mpesaCode },
      },
      trigger: { channelId: NOTIFICATION_CHANNEL_ID },
    });
  } catch {}
}

export async function fireBudgetAlert(
  category: string,
  spentAmount: number,
  limitAmount: number,
  threshold: number,
  level: 'high' | 'medium' | 'low',
  yearMonth: string,
): Promise<void> {
  if (!Notifications) return;
  try {
    const pct = Math.round((spentAmount / limitAmount) * 100);
    const label = level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low';
    const id = `budget-${category}-${level}-${yearMonth}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `${label} Budget Alert: ${category}`,
        body: `You've used ${pct}% of your ${category} budget (${label} threshold: ${threshold}%)`,
        data: { type: 'budget_alert', category, level },
      },
      trigger: { channelId: NOTIFICATION_CHANNEL_ID },
    });
  } catch {}
}

function describeDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}hr`;
  return `${Math.floor(minutes / 1440)}d`;
}
