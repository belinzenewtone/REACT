import { requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Resolve the native module via `requireNativeModule` (the supported API on
 * Expo SDK 52+ / New Architecture). The previously used `NativeModulesProxy`
 * is deprecated and resolves to `undefined` on the New Architecture, which
 * made every call below silently no-op and surfaced as
 * "No M-Pesa messages found in this window".
 *
 * Null only when not on Android or the native module isn't compiled in
 * (e.g. Expo Go) — callers get explicit `module_unavailable` errors instead
 * of silent empty results.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LifeosSmsModule: any = (() => {
  if (Platform.OS !== 'android') return null;
  try {
    return requireNativeModule('LifeosSms');
  } catch (e) {
    console.warn(
      '[lifeos-sms] Native module unavailable. SMS import requires a development build (expo run:android) — it does not work in Expo Go.',
      e,
    );
    return null;
  }
})();

/** True when the native SMS module is linked and usable. */
export function isSmsModuleAvailable(): boolean {
  return LifeosSmsModule != null;
}

function requireModule(): any {
  if (!LifeosSmsModule) {
    throw new Error(
      'module_unavailable: lifeos-sms native module is not linked. Build with `expo run:android` (Expo Go is not supported).',
    );
  }
  return LifeosSmsModule;
}

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
  /** Authoritative SMS date for imported entries (enriched from transactions table). */
  smsDate?: string;
}

export interface RejectionEntry {
  reason: string;
  rawSms: string;
  timestampMs: number;
}

export interface ParsedTransaction {
  mpesaCode: string;
  amount: number;
  merchant: string;
  category: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'fuliza';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  dateMs: number;
  balanceAfter: number | null;
  fee: number | null;
  rawSms: string;
  parseRoute: 'direct' | 'review' | 'quarantine';
  semanticHash: string;
  matchPhase: number;
  ruleId: string;
  sourceHash: string;
}

export type SmsPreviewResult =
  | ({ ok: true } & ParsedTransaction)
  | { ok: false; reason: string };

/** Returns true if READ_SMS and RECEIVE_SMS are both granted. */
export async function hasPermissions(): Promise<boolean> {
  return LifeosSmsModule?.hasPermissions() ?? false;
}

/**
 * Returns individual permission status for each SMS permission.
 * Uses RN core PermissionsAndroid — the same API `requestSmsPermissions`
 * uses — so check and request can never disagree. (Previously this went
 * through the native module and reported `false` whenever the module was
 * unavailable, leaving the "Tap to enable SMS" banner stuck after a
 * successful grant.)
 */
export async function checkPermissions(): Promise<{ receive: boolean; read: boolean }> {
  if (Platform.OS !== 'android') return { receive: false, read: false };
  try {
    const [read, receive] = await Promise.all([
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS),
    ]);
    return { receive, read };
  } catch {
    return { receive: false, read: false };
  }
}

/**
 * Bulk-import historical SMS from the device inbox for a date window.
 * Runs as a foreground WorkManager job — survives app kill.
 * Returns stats when complete (blocks until done, up to 5 min).
 */
export async function importHistoricalSms(fromMs: number, toMs: number): Promise<SmsImportResult> {
  // Throws (module_unavailable / sms_permission_denied / worker errors) rather
  // than masking failures as `total: 0`, so the UI can distinguish "genuinely
  // no messages" from "the pipeline never ran".
  const result = await requireModule().importHistoricalSms(fromMs, toMs);
  if (!result) throw new Error('import_returned_no_result');
  return result as SmsImportResult;
}

/** Retrieve import statistics from the audit log. */
export async function getStats(): Promise<SmsStats> {
  return requireModule().getStats();
}

/** Retrieve the last N audit log entries (default 100). */
export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  return LifeosSmsModule?.getAuditLog(limit) ?? [];
}

/** Clear the import audit log. Transactions are not affected. */
export async function clearAuditLog(): Promise<void> {
  return LifeosSmsModule?.clearAuditLog();
}

/** Retrieve recent parse rejections from the in-memory ring buffer (default 20). */
export async function getRecentRejections(limit = 20): Promise<RejectionEntry[]> {
  return LifeosSmsModule?.getRecentRejections(limit) ?? [];
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
  // Expo Modules (SDK 52+) expose addListener directly on the native module.
  if (!LifeosSmsModule) return { remove: () => {} };
  return LifeosSmsModule.addListener('onNewTransaction', listener) as Subscription;
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
  if (!LifeosSmsModule) return { remove: () => {} };
  return LifeosSmsModule.addListener('onFulizaLimitNeeded', listener) as Subscription;
}

/**
 * Enable or disable the background SMS receiver.
 * Persisted in native SharedPreferences — survives app restarts.
 * Default: false (disabled) — user must opt in.
 */
export async function enableBackgroundReceiver(enabled: boolean): Promise<void> {
  // Must throw when the module is missing — otherwise the Settings toggle
  // appears to work while the native SharedPreferences flag never changes.
  return requireModule().enableBackgroundReceiver(enabled);
}

/**
 * True when the app is exempt from Doze/battery optimization — required for
 * the background receiver's WorkManager jobs to run promptly when the app
 * is backgrounded or killed.
 */
export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  return LifeosSmsModule?.isIgnoringBatteryOptimizations() ?? false;
}

/**
 * Opens the system dialog asking the user to exempt the app from battery
 * optimization. Returns true when the dialog (or fallback settings page)
 * was shown; re-check with isIgnoringBatteryOptimizations() afterwards.
 */
export async function requestIgnoreBatteryOptimizations(): Promise<boolean> {
  return requireModule().requestIgnoreBatteryOptimizations();
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
  // Default `enabled: false` — reporting `true` when the module is missing
  // told the UI the background receiver was running when nothing was.
  return LifeosSmsModule?.getReceiverStatus() ?? { enabled: false, lastFireMs: 0 };
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
