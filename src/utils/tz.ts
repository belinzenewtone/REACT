/**
 * Zero-dep IANA-time-zone helpers.
 *
 * The app stores event dates as ISO-8601 UTC strings. The user picks a
 * `time_zone_id` (IANA name like "Africa/Nairobi") separately. These helpers
 * let us:
 *
 *   – build a correct UTC instant from a wall-clock (Y-M-D h:m) in a target
 *     zone → so writes preserve the user's intent independent of device zone;
 *   – re-align a stored UTC instant to a target zone → so reminders fire at
 *     the "right local time" regardless of where the device physically is.
 *
 * Implementation uses `Intl.DateTimeFormat` which is present on all modern
 * Hermes engines shipped with Expo SDK 56. Never touch this file with values
 * outside the RFC-3339 range – it deliberately avoids any library dep.
 */

/** IANA name for the device's current time zone, or 'UTC' as a safe fallback. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Signed offset in minutes east of UTC for a given IANA zone at a given
 * instant. e.g. Africa/Nairobi at any date → +180; America/New_York in
 * winter → -300, in summer (DST) → -240.
 */
export function zoneOffsetMinutes(zoneId: string, at: Date = new Date()): number {
  try {
    // Format the same instant in the target zone AND in UTC, then subtract.
    const partsIn = (zone: string) => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
      const p: Record<string, string> = {};
      for (const part of dtf.formatToParts(at)) {
        if (part.type !== 'literal') p[part.type] = part.value;
      }
      // Intl returns hour '24' at midnight in some locales — normalise.
      if (p.hour === '24') p.hour = '00';
      return p;
    };
    const a = partsIn(zoneId);
    const b = partsIn('UTC');
    const asMs = (p: Record<string, string>) =>
      Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asMs(a) - asMs(b)) / 60_000);
  } catch {
    return 0;
  }
}

/**
 * Build a true UTC ISO string from a wall-clock in the target zone.
 *
 *   wallClockInZoneToUtcIso(2026, 1, 15, 9, 0, 'America/New_York')
 *     → "2026-01-15T14:00:00.000Z"   // 9am NY == 14:00 UTC in winter
 */
export function wallClockInZoneToUtcIso(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  zoneId: string,
): string {
  // Take the wall clock as if it were UTC. That's off by the zone's offset.
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  // The offset at the intended instant. Note: for DST edge cases we use the
  // offset at the naive instant which is correct except in the ambiguous
  // hour when clocks jump — acceptable trade-off for a reminders app.
  const offset = zoneOffsetMinutes(zoneId, new Date(naiveUtcMs));
  const trueUtcMs = naiveUtcMs - offset * 60_000;
  return new Date(trueUtcMs).toISOString();
}

/**
 * Given a stored ISO string that we suspect was written using the DEVICE zone,
 * re-interpret its wall-clock as being in `targetZone` and return the correct
 * UTC ms. Used by the scheduler for legacy rows where the form didn't yet
 * do zone-correct writes.
 *
 * If `targetZone` is unset or equals the device zone, returns the raw ms.
 */
export function reinterpretIsoInZone(iso: string, targetZone?: string | null): number {
  const parsed = new Date(iso);
  if (!targetZone || targetZone === deviceTimeZone()) return parsed.getTime();
  // Extract the wall-clock the device-local user "saw" when the ISO was
  // written. `getUTCXxx` returns the UTC parts, which for a Date built from
  // a local Date + toISOString() equals the local wall-clock offset by the
  // device's own offset — but we don't know the device zone that wrote it.
  // Best available heuristic: assume the wall clock is what the ISO
  // literally shows (UTC parts) and re-anchor into targetZone.
  return wallClockInZoneToUtcMs(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    targetZone,
  );
}

function wallClockInZoneToUtcMs(
  y: number, m: number, d: number, h: number, mi: number, zone: string,
): number {
  const naiveUtc = Date.UTC(y, m - 1, d, h, mi, 0);
  const off = zoneOffsetMinutes(zone, new Date(naiveUtc));
  return naiveUtc - off * 60_000;
}
