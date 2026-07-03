import {
  formatCurrency,
  formatAmount,
  formatPercent,
  formatDate,
  formatTime,
  formatRelativeDay,
  toLocalIso,
  clamp,
  hexToRgba,
} from '../formatters';

describe('formatCurrency', () => {
  it('formats with thousands separators and 2 decimals', () => {
    const s = formatCurrency(1234.5);
    expect(s).toMatch(/1,234\.50/);
  });

  it('prefixes negatives with a minus', () => {
    expect(formatCurrency(-500)).toMatch(/^-/);
  });

  it('adds an explicit sign when requested', () => {
    expect(formatCurrency(500, { sign: true })).toMatch(/^\+/);
    expect(formatCurrency(-500, { sign: true })).toMatch(/^-/);
  });

  it('respects the decimals option', () => {
    const s = formatCurrency(1234.56, { decimals: 0 });
    expect(s).toMatch(/1,235/);
    expect(s).not.toMatch(/\.\d/);
  });
});

describe('formatAmount / formatPercent', () => {
  it('formats plain amounts', () => {
    expect(formatAmount(1234567.891)).toMatch(/1,234,567\.89/);
  });

  it('formats percentages with a fixed decimal', () => {
    expect(formatPercent(87.256)).toBe('87.3%');
    expect(formatPercent(50, 0)).toBe('50%');
  });
});

describe('formatDate / formatTime', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-07-03T09:30:00.000')).toBe('03 Jul 2026');
  });

  it('formats time in 24h and 12h', () => {
    expect(formatTime('2026-07-03T14:05:00.000')).toBe('14:05');
    expect(formatTime('2026-07-03T14:05:00.000', false)).toBe('2:05 PM');
  });
});

describe('formatRelativeDay', () => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };

  it('labels today, tomorrow, and yesterday', () => {
    expect(formatRelativeDay(day(0))).toBe('Today');
    expect(formatRelativeDay(day(1))).toBe('Tomorrow');
    expect(formatRelativeDay(day(-1))).toBe('Yesterday');
  });

  it('uses the weekday name within the coming week', () => {
    const target = day(3);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(formatRelativeDay(target)).toBe(weekdays[target.getDay()]);
  });

  it('falls back to dd MMM outside the week window', () => {
    expect(formatRelativeDay(day(30))).toMatch(/^\d{2} [A-Z][a-z]{2}$/);
  });
});

describe('toLocalIso', () => {
  it('produces a local wall-clock string without timezone suffix', () => {
    const s = toLocalIso(new Date(2026, 6, 3, 9, 5, 7, 42));
    expect(s).toBe('2026-07-03T09:05:07.042');
  });
});

describe('clamp', () => {
  it('clamps to bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('hexToRgba', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#FF8800', 0.5)).toBe('rgba(255, 136, 0, 0.5)');
    expect(hexToRgba('00FF00', 1)).toBe('rgba(0, 255, 0, 1)');
  });
});
