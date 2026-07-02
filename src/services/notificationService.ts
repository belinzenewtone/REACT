import { Platform } from 'react-native';

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

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'LifeOS Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function cancelByPrefix(prefix: string): Promise<void> {
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
): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelByPrefix(`event-${eventId}-`);
    const eventDate = new Date(eventDateISO);
    const eventMs = eventDate.getTime();
    const now = Date.now();
    const emoji = eventType === 'birthday' ? '🎂' : eventType === 'anniversary' ? '💞' : '📅';

    // Default 1-day-before reminder for birthdays/anniversaries with no offsets
    const effectiveOffsets =
      reminderOffsets.length === 0 && (eventType === 'birthday' || eventType === 'anniversary')
        ? [1440]
        : reminderOffsets;

    for (const offsetMin of effectiveOffsets) {
      let fireMs = eventMs - offsetMin * 60_000;

      // For countdown with a user-specified time of day, snap the fire time to that clock time
      if (eventType === 'countdown' && reminderTimeOfDayMinutes != null) {
        const fireDate = new Date(fireMs);
        fireDate.setHours(
          Math.floor(reminderTimeOfDayMinutes / 60),
          reminderTimeOfDayMinutes % 60,
          0,
          0,
        );
        fireMs = fireDate.getTime();
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

export async function fireBudgetAlertLevels(
  category: string,
  spentAmount: number,
  limitAmount: number,
  thresholds: { high: number; medium: number; low: number },
  yearMonth: string,
): Promise<void> {
  if (!Notifications) return;
  try {
    const pct = Math.round((spentAmount / limitAmount) * 100);
    const levels: Array<{ key: 'high' | 'medium' | 'low'; label: string }> = [
      { key: 'high', label: 'High' },
      { key: 'medium', label: 'Medium' },
      { key: 'low', label: 'Low' },
    ];
    for (const level of levels) {
      if (pct < thresholds[level.key]) continue;
      // Stable per-category per-level per-month identifier prevents re-firing
      const id = `budget-${category}-${level.key}-${yearMonth}`;
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      if (existing.some((n) => n.identifier === id)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: `${level.label} Budget Alert: ${category}`,
          body: `You've used ${pct}% of your ${category} budget (${level.label} threshold: ${thresholds[level.key]}%)`,
          data: { type: 'budget_alert', category, level: level.key },
        },
        trigger: null,
      });
    }
  } catch {}
}

function describeDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}hr`;
  return `${Math.floor(minutes / 1440)}d`;
}
