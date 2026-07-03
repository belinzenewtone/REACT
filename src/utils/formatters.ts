import { format, parseISO } from 'date-fns';

/**
 * Formatting utilities matching the Kotlin LifeOS display conventions.
 */

const DEFAULT_CURRENCY = 'KES';
const DEFAULT_LOCALE = 'en-KE';

export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    decimals?: number;
    sign?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { currency = DEFAULT_CURRENCY, decimals = 2, sign = false, compact = false } = options;

  const absAmount = Math.abs(amount);
  const value = compact && absAmount >= 1000 ? absAmount / 1000 : absAmount;

  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    currencyDisplay: 'symbol',
  });

  let formatted = formatter.format(value);
  if (compact && absAmount >= 1000) {
    formatted = formatted.replace(/\s?KSh/, 'K');
  }

  if (sign) {
    const prefix = amount < 0 ? '-' : amount > 0 ? '+' : '';
    formatted = `${prefix}${formatted}`;
  } else if (amount < 0) {
    formatted = `-${formatted}`;
  }

  return formatted;
}

export function formatAmount(amount: number, decimals = 2): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(
  date: string | Date | number,
  dateFormat: string = 'dd MMM yyyy'
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, dateFormat);
}

export function formatTime(date: string | Date | number, use24h = true): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, use24h ? 'HH:mm' : 'h:mm a');
}

export function formatDateTime(
  date: string | Date | number,
  options: { dateFormat?: string; use24h?: boolean } = {}
): string {
  const { dateFormat = 'dd MMM yyyy', use24h = true } = options;
  return `${formatDate(date, dateFormat)} · ${formatTime(date, use24h)}`;
}

export function formatRelativeDay(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return format(d, 'EEEE');
  return format(d, 'dd MMM');
}

/**
 * Convert a local Date to an ISO-like string without timezone suffix.
 *
 * SMS-imported transactions are stored as local wall-clock strings
 * (YYYY-MM-DDTHH:MM:SS). Comparing them with UTC ISO strings works for fixed
 * offsets but can drift across DST. This helper produces a local datetime
 * string so period-boundary comparisons align with the stored values.
 */
export function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
