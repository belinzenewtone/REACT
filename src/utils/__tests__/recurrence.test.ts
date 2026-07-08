import { nextOccurrenceISO, advanceCadencePastNow, addMonthsClamped, daysInUTCMonth } from '../recurrence';

// Fixed "now" for determinism: 2026-07-03T12:00:00Z (a Friday).
const NOW = Date.parse('2026-07-03T12:00:00.000Z');

describe('daysInUTCMonth', () => {
  it('knows month lengths', () => {
    expect(daysInUTCMonth(2026, 0)).toBe(31); // Jan
    expect(daysInUTCMonth(2026, 1)).toBe(28); // Feb non-leap
    expect(daysInUTCMonth(2028, 1)).toBe(29); // Feb leap
    expect(daysInUTCMonth(2026, 3)).toBe(30); // Apr
  });
});

describe('addMonthsClamped', () => {
  it('advances a plain date one month', () => {
    const d = addMonthsClamped(new Date('2026-03-15T09:00:00.000Z'), 1, 15);
    expect(d.toISOString()).toBe('2026-04-15T09:00:00.000Z');
  });

  it('clamps Jan 31 to Feb 28 without overflowing into March', () => {
    const d = addMonthsClamped(new Date('2026-01-31T09:00:00.000Z'), 1, 31);
    expect(d.toISOString()).toBe('2026-02-28T09:00:00.000Z');
  });

  it('restores the anchor day after a short month', () => {
    const feb = addMonthsClamped(new Date('2026-01-31T09:00:00.000Z'), 1, 31);
    const mar = addMonthsClamped(feb, 1, 31);
    expect(mar.toISOString()).toBe('2026-03-31T09:00:00.000Z');
  });

  it('handles year rollover', () => {
    const d = addMonthsClamped(new Date('2026-12-31T09:00:00.000Z'), 1, 31);
    expect(d.toISOString()).toBe('2027-01-31T09:00:00.000Z');
  });
});

describe('nextOccurrenceISO', () => {
  it('returns base unchanged for rule none', () => {
    expect(nextOccurrenceISO('2026-01-01T08:00:00.000Z', 'none', null, NOW))
      .toBe('2026-01-01T08:00:00.000Z');
  });

  it('returns base unchanged when already in the future', () => {
    expect(nextOccurrenceISO('2026-12-25T08:00:00.000Z', 'yearly', null, NOW))
      .toBe('2026-12-25T08:00:00.000Z');
  });

  it('rolls a past daily event to tomorrow-relative occurrence', () => {
    const next = nextOccurrenceISO('2026-07-01T08:00:00.000Z', 'daily', null, NOW);
    expect(next).toBe('2026-07-04T08:00:00.000Z'); // first 08:00 after Jul 3 12:00
  });

  it('rolls a weekly event forward preserving weekday and time', () => {
    // Base Monday 2026-06-01 09:00 → next Monday after NOW is 2026-07-06.
    const next = nextOccurrenceISO('2026-06-01T09:00:00.000Z', 'weekly', null, NOW);
    expect(next).toBe('2026-07-06T09:00:00.000Z');
    expect(new Date(next).getUTCDay()).toBe(1);
  });

  it('rolls a yearly birthday to next year', () => {
    const next = nextOccurrenceISO('1990-03-15T06:00:00.000Z', 'yearly', null, NOW);
    expect(next).toBe('2027-03-15T06:00:00.000Z');
  });

  it('clamps a Feb 29 birthday to Feb 28 on non-leap years', () => {
    const next = nextOccurrenceISO('2024-02-29T06:00:00.000Z', 'yearly', null, NOW);
    expect(next).toBe('2027-02-28T06:00:00.000Z');
  });

  it('keeps monthly 31st anchored through short months', () => {
    // Base May 31 → June has 30 days → clamp to Jun 30; that's < NOW (Jul 3),
    // so next is Jul 31 (anchor restored), not Jul 30.
    const next = nextOccurrenceISO('2026-05-31T10:00:00.000Z', 'monthly', null, NOW);
    expect(next).toBe('2026-07-31T10:00:00.000Z');
  });

  it('does not roll past a repeat end date', () => {
    const base = '2026-06-01T09:00:00.000Z';
    // Series ended before NOW → base returned so caller skips scheduling.
    expect(nextOccurrenceISO(base, 'weekly', '2026-06-20T00:00:00.000Z', NOW)).toBe(base);
  });

  it('returns base for an invalid date', () => {
    expect(nextOccurrenceISO('garbage', 'weekly', null, NOW)).toBe('garbage');
  });
});

describe('advanceCadencePastNow', () => {
  it('returns null when already in the future', () => {
    expect(advanceCadencePastNow('2026-12-01T09:00:00.000Z', 'monthly', NOW)).toBeNull();
  });

  it('returns null for an invalid iso or unknown cadence', () => {
    expect(advanceCadencePastNow('garbage', 'daily', NOW)).toBeNull();
    expect(advanceCadencePastNow('2026-01-01T09:00:00.000Z', 'fortnightly', NOW)).toBeNull();
  });

  it('advances hourly to the next future hour slot', () => {
    const next = advanceCadencePastNow('2026-07-03T09:30:00.000Z', 'hourly', NOW);
    expect(next).toBe('2026-07-03T12:30:00.000Z');
  });

  it('advances daily preserving time of day', () => {
    const next = advanceCadencePastNow('2026-06-28T05:00:00.000Z', 'daily', NOW);
    expect(next).toBe('2026-07-04T05:00:00.000Z');
  });

  it('advances weekly preserving weekday', () => {
    const next = advanceCadencePastNow('2026-06-02T18:00:00.000Z', 'weekly', NOW); // Tuesday
    expect(next).toBe('2026-07-07T18:00:00.000Z');
    expect(new Date(next!).getUTCDay()).toBe(2);
  });

  it('advances biweekly in 14-day steps from the anchor', () => {
    // Jun 5 → Jun 19 → Jul 3 18:00, which is after NOW (Jul 3 12:00) — stops there.
    const next = advanceCadencePastNow('2026-06-05T18:00:00.000Z', 'biweekly', NOW);
    expect(next).toBe('2026-07-03T18:00:00.000Z');
  });

  it('advances mon_fri to the next weekday only', () => {
    // Friday Jul 3 09:00 is past NOW-noon? 09:00 < 12:00 → advance.
    const next = advanceCadencePastNow('2026-07-03T09:00:00.000Z', 'mon_fri', NOW);
    expect(next).toBe('2026-07-06T09:00:00.000Z'); // skips Sat/Sun → Monday
    expect([0, 6]).not.toContain(new Date(next!).getUTCDay());
  });

  it('advances monthly with 31st clamping', () => {
    const next = advanceCadencePastNow('2026-05-31T08:00:00.000Z', 'monthly', NOW);
    expect(next).toBe('2026-07-31T08:00:00.000Z');
  });

  it('advances yearly', () => {
    // 2026-07-01 is still before NOW (Jul 3) → lands on 2027.
    const next = advanceCadencePastNow('2025-07-01T08:00:00.000Z', 'yearly', NOW);
    expect(next).toBe('2027-07-01T08:00:00.000Z');
  });
});
