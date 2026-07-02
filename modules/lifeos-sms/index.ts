import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LifeosSmsModule: any = NativeModulesProxy.LifeosSms;
const emitter = new EventEmitter(LifeosSmsModule ?? {});

export type Subscription = { remove: () => void };

export interface SmsImportResult {
  total: number;
  imported: number;
  duplicates: number;
  quarantined: number;
  failed: number;
  workId: string;
}

export interface SmsStats {
  totalImported: number;
  totalDuplicates: number;
  totalQuarantined: number;
  totalFailed: number;
  lastImportAt: string | null;
}

export interface AuditEntry {
  id: number;
  mpesaCode: string | null;
  rawMessage: string;
  amount: number | null;
  merchant: string | null;
  outcome: string;
  failureReason: string | null;
  confidence: string | null;
  createdAt: string;
}

export interface ParsedTransaction {
  mpesaCode: string;
  amount: number;
  merchant: string;
  category: string;
  transactionType: 'income' | 'expense' | 'transfer';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  dateMs: number;
  balanceAfter: number | null;
}

export type SmsPreviewResult =
  | ({ ok: true } & ParsedTransaction & { parseRoute: string; semanticHash: string; matchPhase: number })
  | { ok: false; reason: string };

/** Returns true if READ_SMS and RECEIVE_SMS are both granted. */
export async function hasPermissions(): Promise<boolean> {
  return LifeosSmsModule?.hasPermissions() ?? false;
}

/** Returns individual permission status for each SMS permission. */
export async function checkPermissions(): Promise<{ receive: boolean; read: boolean }> {
  return LifeosSmsModule?.checkPermissions() ?? { receive: false, read: false };
}

/**
 * Bulk-import historical SMS from the device inbox for a date window.
 * Runs as a foreground WorkManager job — survives app kill.
 * Returns stats when complete (blocks until done, up to 5 min).
 */
export async function importHistoricalSms(fromMs: number, toMs: number): Promise<SmsImportResult> {
  return LifeosSmsModule?.importHistoricalSms(fromMs, toMs) ?? { total: 0, imported: 0, duplicates: 0, quarantined: 0, failed: 0, workId: '' };
}

/** Retrieve import statistics from the audit log. */
export async function getStats(): Promise<SmsStats> {
  return LifeosSmsModule?.getStats() ?? { totalImported: 0, totalDuplicates: 0, totalQuarantined: 0, totalFailed: 0, lastImportAt: null };
}

/** Retrieve the last N audit log entries (default 100). */
export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  return LifeosSmsModule?.getAuditLog(limit) ?? [];
}

/**
 * Retry all quarantined SMS entries.
 * Useful after updating the parser or fixing a categorisation rule.
 */
export async function retryQuarantined(): Promise<{ retried: number; imported: number }> {
  return LifeosSmsModule?.retryQuarantined() ?? { retried: 0, imported: 0 };
}

/**
 * Retry a single quarantined audit entry by its row ID.
 * Re-parses the raw SMS and inserts it if it now passes confidence threshold.
 */
export async function retrySingle(id: number): Promise<{ ok: boolean; error?: string; note?: string }> {
  return LifeosSmsModule?.retrySingle(id) ?? { ok: false, error: 'module_unavailable' };
}

/**
 * Parse a single SMS string and return the result without writing to the DB.
 * Useful for testing and the debug/review queue UI.
 */
export async function parseSmsPreview(smsBody: string): Promise<SmsPreviewResult> {
  return LifeosSmsModule?.parseSmsPreview(smsBody) ?? { ok: false, reason: 'module_unavailable' };
}

/**
 * Subscribe to real-time new-transaction events emitted when an incoming
 * M-Pesa SMS is parsed and inserted while the app is in the foreground.
 */
export function addNewTransactionListener(
  listener: (tx: ParsedTransaction) => void,
): Subscription {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (emitter as any).addListener('onNewTransaction', listener) as Subscription;
}

/**
 * Subscribe to Fuliza-limit-needed events.
 * Fired when an M-Pesa Fuliza SMS is detected but the user has not yet
 * configured their Fuliza credit limit in Settings.
 * Show the FulizaLimitModal when this event fires.
 */
export function addFulizaLimitNeededListener(
  listener: (data: { outstandingKes: number; category: 'charge' | 'repayment' }) => void,
): Subscription {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (emitter as any).addListener('onFulizaLimitNeeded', listener) as Subscription;
}

/**
 * Enable or disable the background SMS receiver.
 * Persisted in native SharedPreferences — survives app restarts.
 * Default: true (enabled).
 */
export async function enableBackgroundReceiver(enabled: boolean): Promise<void> {
  return LifeosSmsModule?.enableBackgroundReceiver(enabled);
}

/**
 * Persist the user's Fuliza credit limit to native SharedPreferences so the
 * background worker can compute outstanding balances without waking the JS layer.
 */
export async function setFulizaLimit(limitKes: number): Promise<void> {
  return LifeosSmsModule?.setFulizaLimit(limitKes);
}

/**
 * Returns the current state of the background SMS receiver.
 * `enabled` — whether the toggle is on.
 * `lastFireMs` — epoch ms of the last time SmsReceiver.onReceive() fired (0 if never).
 */
export async function getReceiverStatus(): Promise<{ enabled: boolean; lastFireMs: number }> {
  return LifeosSmsModule?.getReceiverStatus() ?? { enabled: true, lastFireMs: 0 };
}

/**
 * Request READ_SMS and RECEIVE_SMS permissions from the user.
 * Returns `{ granted: boolean }`.
 * On iOS (where SMS APIs don't exist) always returns `{ granted: false }`.
 */
export async function requestSmsPermissions(): Promise<{ granted: boolean }> {
  if (Platform.OS !== 'android') return { granted: false };
  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    const granted =
      results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    return { granted };
  } catch {
    return { granted: false };
  }
}
