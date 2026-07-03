/**
 * Pure recurrence math — no React/Expo/store imports so it is unit-testable
 * in plain Node (jest). Used by notificationSyncService for repeating events
 * (birthday/anniversary/countdown/weekly…) and recurring-rule cadences.
 *
 * All arithmetic is UTC-based with an anchored day-of-month so "31st monthly"
 * never drifts through short months (Jan 31 → Feb 28 → Mar 31, not Mar 3),
 * and Feb 29 yearly anchors clamp to Feb 28 on non-leap years.
 */

export function daysInUTCMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Add months preserving the anchored day-of-month, clamped to the target
 * month's length. Prevents JS Date overflow (Jan 31 + 1mo → Mar 3).
 */
export function addMonthsClamped(d: Date, months: number, anchorDay: number): Date {
  const next = new Date(d);
  const targetMonth = next.getUTCMonth() + months;
  next.setUTCDate(1); // avoid overflow while changing month
  next.setUTCMonth(targetMonth);
  next.setUTCDate(Math.min(anchorDay, daysInUTCMonth(next.getUTCFullYear(), next.getUTCMonth())));
  return next;
}

/**
 * For repeating events (birthday/anniversary/yearly), roll the base ISO date
 * forward to the next occurrence AFTER `nowMs` so a future notification can
 * be scheduled. Respects `repeatEndIso` — if the series has ended, returns
 * the original base ISO so callers' `fireMs <= now` guards skip scheduling.
 *
 * `nowMs` is injectable for deterministic tests; defaults to Date.now().
 */
export function nextOccurrenceISO(
  baseIso: string,
  rule: string,
  repeatEndIso?: string | null,
  nowMs: number = Date.now(),
): string {
  const base = new Date(baseIso);
  if (isNaN(base.getTime()) || rule === 'none') return baseIso;
  const endMs = repeatEndIso ? new Date(repeatEndIso).getTime() : Number.POSITIVE_INFINITY;
  if (nowMs > endMs) return baseIso; // series ended — don't roll forward
  const HARD_CAP = 400;
  let cursor = new Date(base);
  const anchorDay = base.getUTCDate();
  for (let i = 0; i < HARD_CAP; i++) {
    if (cursor.getTime() > nowMs) {
      return cursor.getTime() > endMs ? baseIso : cursor.toISOString();
    }
    switch (rule) {
      case 'daily':   cursor.setUTCDate(cursor.getUTCDate() + 1); break;
      case 'weekly':  cursor.setUTCDate(cursor.getUTCDate() + 7); break;
      case 'monthly': cursor = addMonthsClamped(cursor, 1, anchorDay); break;
      case 'yearly': {
        // Feb 29 birthdays: clamp to Feb 28 on non-leap years.
        const y = cursor.getUTCFullYear() + 1;
        cursor = new Date(cursor);
        cursor.setUTCFullYear(y, cursor.getUTCMonth(), 1);
        cursor.setUTCDate(Math.min(anchorDay, daysInUTCMonth(y, cursor.getUTCMonth())));
        break;
      }
      default:        return baseIso;
    }
  }
  return baseIso;
}

/**
 * Advance a recurring rule's `next_run_at` past `nowMs` by its cadence.
 * Returns null when the timestamp is already in the future (nothing to do),
 * invalid, or the cadence is unknown.
 */
export function advanceCadencePastNow(
  iso: string,
  cadence: string,
  nowMs: number = Date.now(),
): string | null {
  const base = new Date(iso);
  if (isNaN(base.getTime())) return null;
  if (base.getTime() > nowMs) return null;
  const anchorDay = base.getUTCDate();
  let cursor = new Date(base);
  for (let i = 0; i < 5000 && cursor.getTime() <= nowMs; i++) {
    switch (cadence) {
      case 'hourly':   cursor.setTime(cursor.getTime() + 3_600_000); break;
      case 'daily':    cursor.setUTCDate(cursor.getUTCDate() + 1); break;
      case 'weekly':   cursor.setUTCDate(cursor.getUTCDate() + 7); break;
      case 'biweekly': cursor.setUTCDate(cursor.getUTCDate() + 14); break;
      case 'mon_fri': {
        // Next weekday (Mon–Fri) at the same time.
        do {
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6);
        break;
      }
      case 'monthly':  cursor = addMonthsClamped(cursor, 1, anchorDay); break;
      case 'yearly':   cursor = addMonthsClamped(cursor, 12, anchorDay); break;
      default:         return null; // unknown cadence — leave untouched
    }
  }
  return cursor.getTime() > nowMs ? cursor.toISOString() : null;
}
