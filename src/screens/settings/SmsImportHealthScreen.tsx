import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';
import {
  getStats,
  getAuditLog,
  getRecentRejections,
  getReceiverStatus,
  importHistoricalSms,
  retryQuarantined,
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
  getIngestQueueStatus,
  retryIngestQueue,
  type SmsStats,
  type AuditEntry,
  type RejectionEntry,
} from '../../../modules/lifeos-sms';
import { useDataVersion } from '../../store/dataVersion';
import { useLiveQuery } from '../../hooks/useLiveQuery';

const LAST_CLEARED_ID_KEY = '@sms_audit_log_last_cleared_id';

function SectionCard({ title, children, colors }: { title?: string; children: React.ReactNode; colors: any }) {
  return (
    <GlassCard style={styles.sectionCard}>
      {title && (
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      )}
      {children}
    </GlassCard>
  );
}

function TimestampRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={styles.tsRow}>
      <Ionicons name={icon} size={16} color={colors.accentPrimary} />
      <Text style={[styles.tsLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.tsValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function CounterCell({ value, label, valueColor, colors }: { value: string; label: string; valueColor?: string; colors: any }) {
  return (
    <View style={styles.counterCell}>
      <Text style={[styles.counterValue, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Pick the most authoritative timestamp to display for an audit entry. */
function auditDisplayTimestamp(entry?: AuditEntry): string | null | undefined {
  if (!entry) return undefined;
  // For imported transactions, the transactions table holds the real SMS date.
  if (entry.smsDate && (entry.outcome.startsWith('imported_') || entry.outcome.startsWith('retry_imported'))) {
    return entry.smsDate;
  }
  return entry.createdAt;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) +
      ', ' +
      d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return iso;
  }
}

/**
 * Resolve the authoritative SMS timestamp for audit entries that resulted in
 * an imported transaction. The audit row's `createdAt` records when the
 * message was processed (UTC), which can be hours behind the real SMS date
 * for historical imports. The transactions table stores the actual SMS date
 * parsed from the message, so use that as the source of truth.
 */
async function enrichAuditWithSmsDates(
  db: any,
  entries: AuditEntry[],
): Promise<AuditEntry[]> {
  if (entries.length === 0) return entries;
  const codes = entries
    .map((e) => e.mpesaCode)
    .filter((c): c is string => !!c);
  const dateByCode = new Map<string, string>();
  if (codes.length > 0) {
    const placeholders = codes.map(() => '?').join(',');
    try {
      const rows = (await db.getAllAsync(
        `SELECT mpesa_code, date FROM transactions WHERE mpesa_code IN (${placeholders}) AND deleted_at IS NULL`,
        codes,
      )) as { mpesa_code: string; date: string }[];
      for (const row of rows) {
        if (row.mpesa_code && row.date) {
          dateByCode.set(row.mpesa_code, row.date);
        }
      }
    } catch (e) {
      console.warn('enrichAuditWithSmsDates lookup failed', e);
    }
  }
  return entries.map((e) => ({
    ...e,
    smsDate: dateByCode.get(e.mpesaCode ?? '') ?? undefined,
  }));
}

function outcomeColor(outcome: string, colors: any): string {
  if (outcome.includes('imported') || outcome.includes('realtime') || outcome.includes('retry')) return colors.accentPrimary;
  if (outcome.includes('failed') || outcome.includes('error')) return colors.danger;
  if (outcome.includes('quarantine')) return colors.warning;
  if (outcome.includes('duplicate') || outcome.includes('skipped') || outcome.includes('ignored')) return colors.textTertiary;
  if (outcome.includes('fuliza')) return '#FB923C';
  return colors.textSecondary;
}

function outcomeLabelShort(outcome: string): string {
  if (outcome.startsWith('imported_realtime')) return 'realtime';
  if (outcome.startsWith('imported_review')) return 'review';
  if (outcome.startsWith('imported_batch')) return 'batch';
  if (outcome.startsWith('retry_imported')) return 'retried';
  if (outcome.startsWith('fuliza_balance')) return 'fuliza';
  if (outcome.startsWith('duplicate_detected')) return 'duplicate';
  if (outcome.startsWith('quarantined')) return 'quarantined';
  if (outcome.startsWith('parse_failed')) return outcome.replace('parse_failed:', 'fail:');
  if (outcome.startsWith('import_failed')) return 'failed';
  if (outcome.startsWith('ignored')) return 'ignored';
  if (outcome.startsWith('dismissed')) return 'dismissed';
  if (outcome.startsWith('retried')) return 'retried';
  return outcome.length > 20 ? outcome.slice(0, 20) + '…' : outcome;
}

// Turn raw parser rejection reason codes into human-friendly labels.
function rejectionReasonLabel(reason: string): string {
  if (reason.startsWith('parse_exception')) return 'Parser exception';
  switch (reason) {
    case 'not_mpesa':          return 'Not an M-Pesa SMS';
    case 'fuliza_notice':      return 'Fuliza service notice';
    case 'ambiguous_receipt':  return 'Ambiguous receipt';
    case 'no_code':            return 'No M-Pesa code found';
    case 'no_amount':          return 'No amount extractable';
    default:                   return reason;
  }
}

export function SmsImportHealthScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [rejections, setRejections] = useState<RejectionEntry[]>([]);
  const [receiverEnabled, setReceiverEnabled] = useState(true);
  const [lastFireMs, setLastFireMs] = useState(0);
  const [batteryExempt, setBatteryExempt] = useState(true);
  const [ingestQueue, setIngestQueue] = useState<{ pending: number; failed: number; oldestPendingAt: string | null }>({
    pending: 0,
    failed: 0,
    oldestPendingAt: null,
  });
  const [dbIntegrityOk, setDbIntegrityOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastClearedId, setLastClearedId] = useState(0);
  // Subscribe to the global dataVersion so this screen refreshes automatically
  // when another surface (Finance import, real-time SmsReceiver, retry) bumps it.
  const dataVersion = useDataVersion((s) => s.version);

  // Load the last "cleared" audit ID once on mount. Entries at or below this
  // ID are hidden from the Import Log view without deleting them from the DB,
  // so lifetime stats and future imports keep working.
  useEffect(() => {
    AsyncStorage.getItem(LAST_CLEARED_ID_KEY)
      .then((raw) => {
        const id = raw ? parseInt(raw, 10) : 0;
        setLastClearedId(Number.isNaN(id) ? 0 : id);
      })
      .catch(() => setLastClearedId(0));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, entries, recentRejections, receiverStatus, exempt, queueStatus] = await Promise.all([
        getStats(),
        getAuditLog(100),
        getRecentRejections(20),
        getReceiverStatus(),
        isIgnoringBatteryOptimizations(),
        getIngestQueueStatus(),
      ]);
      setStats(s);
      setIngestQueue(queueStatus);
      // Hide entries the user has previously cleared. We fetch more than the
      // display limit so that, after filtering, the latest 10 visible entries
      // still surface correctly.
      const visible = (await enrichAuditWithSmsDates(db, entries)).filter(
        (e) => (e.id ?? 0) > lastClearedId
      );
      setAuditEntries(visible.slice(0, 10));
      setRejections(recentRejections);
      setReceiverEnabled(receiverStatus.enabled);
      setLastFireMs(receiverStatus.lastFireMs);
      setBatteryExempt(exempt);
      // Cheap SQLite self-check — surfaces file corruption before it bites.
      try {
        const integ = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
        setDbIntegrityOk((integ?.integrity_check ?? 'ok') === 'ok');
      } catch {
        setDbIntegrityOk(true); // inconclusive — don't alarm
      }
    } catch (e) {
      console.warn('SmsHealth load error', e);
    } finally {
      setLoading(false);
    }
  }, [db, lastClearedId]);

  // Mount, focus-with-new-data, and realtime-bump reloads.
  useLiveQuery(load);

  // Recompute "Active vs Idle" label as time passes even without new data.
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const result = await importHistoricalSms(sevenDaysAgo, Date.now());
      useDataVersion.getState().bump();
      await load();
      Alert.alert(
        'Reconcile complete',
        `Scanned ${result.total} messages · ${result.imported} new · ${result.duplicates} duplicates · ${result.failed} failed`
      );
    } catch (e: any) {
      Alert.alert('Reconcile failed', e?.message ?? 'Unknown error');
    } finally {
      setReconciling(false);
    }
  };

  const handleRetryQueue = async () => {
    setRetrying(true);
    try {
      const result = await retryQuarantined();
      useDataVersion.getState().bump();
      await load();
      Alert.alert(
        'Retry complete',
        `Reprocessed ${result.retried} entries · ${result.imported} recovered`
      );
    } catch (e: any) {
      Alert.alert('Retry failed', e?.message ?? 'Unknown error');
    } finally {
      setRetrying(false);
    }
  };

  const handleClearAudit = () => {
    Alert.alert(
      'Clear import log view?',
      'This hides the current log entries from view. Lifetime counters stay the same, and new M-Pesa imports will still appear here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Fetch the latest batch so we can compute the highest visible ID.
              const entries = await getAuditLog(100);
              const maxId = entries.reduce((max, e) => Math.max(max, e.id ?? 0), 0);
              await AsyncStorage.setItem(LAST_CLEARED_ID_KEY, String(maxId));
              setLastClearedId(maxId);
              setAuditEntries([]);
            } catch (e: any) {
              Alert.alert('Clear failed', e?.message ?? 'Unknown error');
            }
          },
        },
      ]
    );
  };

  const totalProcessed = (stats?.totalImported ?? 0) + (stats?.totalDuplicates ?? 0) + (stats?.totalFailed ?? 0) + (stats?.totalQuarantined ?? 0);
  const successRate = totalProcessed > 0 ? Math.round(((stats?.totalImported ?? 0) * 100) / totalProcessed) : 0;

  const lastEntry = auditEntries[0];
  // `imported_*` outcomes: imported_realtime, imported_batch, imported_review, retry_imported
  const lastImported = auditEntries.find(
    (e) => e.outcome.startsWith('imported_') || e.outcome.startsWith('retry_imported')
  );
  const lastRealtime = auditEntries.find((e) => e.outcome.startsWith('imported_realtime'));
  const lastBatch = auditEntries.find(
    (e) => e.outcome.startsWith('imported_batch') || e.outcome.startsWith('imported_review')
  );

  const receiverStatus: 'active' | 'idle' | 'disabled' | 'unknown' = (() => {
    if (!receiverEnabled) return 'disabled';
    if (lastFireMs === 0) return 'unknown';
    const hoursAgo = (nowTick - lastFireMs) / (1000 * 60 * 60);
    return hoursAgo <= 24 ? 'active' : 'idle';
  })();
  const receiverStatusColor =
    receiverStatus === 'active' ? colors.accentPrimary
    : receiverStatus === 'disabled' ? colors.danger
    : receiverStatus === 'idle' ? colors.textTertiary
    : colors.warning;
  const receiverStatusLabel =
    receiverStatus === 'active' ? 'Active'
    : receiverStatus === 'disabled' ? 'Disabled'
    : receiverStatus === 'idle' ? 'Idle'
    : 'Waiting';
  const lastFireLabel = lastFireMs > 0 ? formatTimestamp(new Date(lastFireMs).toISOString()) : 'Never';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>SMS Import Health</Text>
          <TouchableOpacity onPress={load} disabled={loading}>
            <Ionicons name="refresh-outline" size={22} color={loading ? colors.textTertiary : colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        {/* Receiver Status */}
        <SectionCard title="Receiver Status" colors={colors}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: `${receiverStatusColor}20` }]}>
              <View style={[styles.statusDotInner, { backgroundColor: receiverStatusColor }]} />
            </View>
            <View style={styles.statusInfo}>
              <View style={styles.statusTitleRow}>
                <Text style={[styles.statusName, { color: colors.textPrimary }]}>Realtime receiver</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${receiverStatusColor}20` }]}>
                  <Text style={[styles.statusBadgeText, { color: receiverStatusColor }]}>{receiverStatusLabel}</Text>
                </View>
              </View>
              <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                {receiverStatus === 'active'
                  ? `Last fired: ${lastFireLabel}`
                  : receiverStatus === 'disabled'
                  ? 'Turn on background receiver in Settings → SMS Import'
                  : receiverStatus === 'idle'
                  ? `No new SMS in 24 h · last fire: ${lastFireLabel}`
                  : 'Waiting for first M-Pesa SMS'}
              </Text>
            </View>
          </View>
          {receiverEnabled && !batteryExempt && (
            <TouchableOpacity
              style={[styles.batteryWarn, { borderColor: colors.warning }]}
              onPress={async () => {
                try {
                  await requestIgnoreBatteryOptimizations();
                  setBatteryExempt(await isIgnoringBatteryOptimizations());
                } catch {}
              }}
            >
              <Ionicons name="battery-half-outline" size={16} color={colors.warning} />
              <Text style={[styles.batteryWarnText, { color: colors.warning }]}>
                Battery optimization is restricting background capture — tap to allow unrestricted battery
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.warning} />
            </TouchableOpacity>
          )}
          {!dbIntegrityOk && (
            <View style={[styles.batteryWarn, { borderColor: colors.danger }]}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} />
              <Text style={[styles.batteryWarnText, { color: colors.danger }]}>
                Database integrity check failed — export your data now (Finance → Export) and reinstall
              </Text>
            </View>
          )}
          {(ingestQueue.pending > 0 || ingestQueue.failed > 0) && (
            <TouchableOpacity
              style={[styles.batteryWarn, { borderColor: ingestQueue.failed > 0 ? colors.danger : colors.warning }]}
              onPress={async () => {
                try {
                  await retryIngestQueue();
                  setIngestQueue(await getIngestQueueStatus());
                } catch {}
              }}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={ingestQueue.failed > 0 ? colors.danger : colors.warning}
              />
              <Text style={[styles.batteryWarnText, { color: ingestQueue.failed > 0 ? colors.danger : colors.warning }]}>
                {`${ingestQueue.pending} queued`}
                {ingestQueue.failed > 0 ? ` · ${ingestQueue.failed} failed` : ''}
                {ingestQueue.oldestPendingAt ? ` · oldest ${formatTimestamp(ingestQueue.oldestPendingAt)}` : ''}
                {' — tap to retry now'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={ingestQueue.failed > 0 ? colors.danger : colors.warning} />
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Lifetime Counters */}
        <SectionCard title="Lifetime Counters" colors={colors}>
          {loading && !stats ? (
            <ActivityIndicator color={colors.accentPrimary} style={{ paddingVertical: spacing.base }} />
          ) : (
            <>
              <View style={styles.countersRow}>
                <CounterCell value={`${stats?.totalImported ?? 0}`} label="Imported" valueColor={colors.accentPrimary} colors={colors} />
                <CounterCell value={`${stats?.totalDuplicates ?? 0}`} label="Duplicates" colors={colors} />
                <CounterCell value={`${stats?.totalQuarantined ?? 0}`} label="Quarantined" valueColor={colors.warning} colors={colors} />
                <CounterCell
                  value={`${stats?.totalFailed ?? 0}`}
                  label="Failed"
                  valueColor={(stats?.totalFailed ?? 0) > 0 ? colors.danger : colors.textPrimary}
                  colors={colors}
                />
              </View>
              {(stats?.totalImported ?? 0) > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.rateRow}>
                    <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>Parse success rate</Text>
                    <Text style={[styles.rateValue, {
                      color: successRate >= 90 ? colors.accentPrimary : successRate >= 70 ? colors.warning : colors.danger,
                    }]}>{successRate}%</Text>
                  </View>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Activity */}
        <SectionCard title="Activity" colors={colors}>
          <TimestampRow icon="mail-outline" label="Last SMS activity" value={formatTimestamp(auditDisplayTimestamp(lastEntry))} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="flash-outline" label="Last realtime capture" value={formatTimestamp(auditDisplayTimestamp(lastRealtime))} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="download-outline" label="Last batch import" value={formatTimestamp(auditDisplayTimestamp(lastBatch) ?? stats?.lastImportAt)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="checkmark-circle-outline" label="Last successful import" value={formatTimestamp(auditDisplayTimestamp(lastImported))} colors={colors} />
        </SectionCard>

        {/* Actions */}
        <SectionCard title="Actions" colors={colors}>
          <Text style={[styles.actionsDesc, { color: colors.textSecondary }]}>
            Reconcile re-imports the last 7 days, skipping duplicates. Retry Queue re-parses quarantined messages.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.accentPrimary, flex: 1, opacity: reconciling ? 0.6 : 1 }]}
              onPress={handleReconcile}
              disabled={reconciling || retrying}
            >
              {reconciling ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Ionicons name="sync-outline" size={16} color={colors.accentPrimary} />
              )}
              <Text style={[styles.actionBtnText, { color: colors.accentPrimary }]}>
                {reconciling ? 'Running…' : 'Reconcile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.accentPrimary, flex: 1, opacity: retrying ? 0.6 : 1 }]}
              onPress={handleRetryQueue}
              disabled={reconciling || retrying}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Ionicons name="refresh-outline" size={16} color={colors.accentPrimary} />
              )}
              <Text style={[styles.actionBtnText, { color: colors.accentPrimary }]}>
                {retrying ? 'Running…' : `Retry Queue${(stats?.totalQuarantined ?? 0) > 0 ? ` (${stats!.totalQuarantined})` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Recent Rejections */}
        {rejections.length > 0 && (
          <SectionCard title="Recent Rejections" colors={colors}>
            <Text style={[styles.actionsDesc, { color: colors.textSecondary }]}>
              Messages skipped by the parser and the reason they were rejected.
            </Text>
            {rejections.slice(0, 5).map((r, i) => (
              <View key={i}>
                <View style={styles.auditRow}>
                  <View style={[styles.auditDot, { backgroundColor: colors.danger }]} />
                  <View style={styles.auditInfo}>
                    <Text style={[styles.auditOutcome, { color: colors.danger }]} numberOfLines={1}>
                      {rejectionReasonLabel(r.reason)}
                    </Text>
                    <Text style={[styles.auditReason, { color: colors.textSecondary }]} numberOfLines={2}>
                      {r.rawSms}
                    </Text>
                    <Text style={[styles.auditTime, { color: colors.textTertiary }]}>
                      {formatTimestamp(new Date(r.timestampMs).toISOString())}
                    </Text>
                  </View>
                </View>
                {i < Math.min(rejections.length, 5) - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </SectionCard>
        )}

        {/* Audit Log */}
        <SectionCard colors={colors}>
          <View style={styles.auditHeader}>
            <View style={styles.auditTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.auditTitle, { color: colors.textPrimary }]}>Import Log</Text>
              {auditEntries.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.bgTertiary }]}>
                  <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{auditEntries.length}</Text>
                </View>
              )}
            </View>
            {auditEntries.length > 0 && (
              <TouchableOpacity onPress={handleClearAudit} style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {loading && auditEntries.length === 0 ? (
            <ActivityIndicator color={colors.accentPrimary} style={{ paddingVertical: spacing.lg }} />
          ) : auditEntries.length === 0 ? (
            <View style={styles.auditEmpty}>
              <Text style={[styles.auditEmptyText, { color: colors.textSecondary }]}>
                No import activity recorded yet.
              </Text>
            </View>
          ) : (
            auditEntries.map((entry, i) => {
              const dotColor = outcomeColor(entry.outcome, colors);
              return (
                <View key={entry.id}>
                  <View style={styles.auditRow}>
                    <View style={[styles.auditDot, { backgroundColor: dotColor }]} />
                    <View style={styles.auditInfo}>
                      <View style={styles.auditTopRow}>
                        <Text style={[styles.auditOutcome, { color: dotColor }]}>
                          {outcomeLabelShort(entry.outcome)}
                        </Text>
                        {entry.mpesaCode && (
                          <Text style={[styles.auditCode, { color: colors.textSecondary }]}>{entry.mpesaCode}</Text>
                        )}
                      </View>
                      {entry.merchant && (
                        <Text style={[styles.auditMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                          {entry.merchant}
                        </Text>
                      )}
                      {entry.amount != null && (
                        <Text style={[styles.auditAmount, { color: colors.textSecondary }]}>
                          Ksh {entry.amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}
                        </Text>
                      )}
                      {entry.failureReason && (
                        <Text style={[styles.auditReason, { color: colors.danger }]} numberOfLines={2}>
                          {entry.failureReason}
                        </Text>
                      )}
                      <Text style={[styles.auditTime, { color: colors.textTertiary }]}>
                        {formatTimestamp(auditDisplayTimestamp(entry))}
                      </Text>
                    </View>
                  </View>
                  {i < auditEntries.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  sectionCard: { gap: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  statusDot: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusDotInner: { width: 12, height: 12, borderRadius: 6 },
  statusInfo: { flex: 1 },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  statusSub: { fontSize: typography.sizes.sm, marginTop: 2 },
  batteryWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  batteryWarnText: { flex: 1, fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  countersRow: { flexDirection: 'row', justifyContent: 'space-around' },
  counterCell: { alignItems: 'center', gap: 4 },
  counterValue: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  counterLabel: { fontSize: typography.sizes.xs },
  divider: { height: 1, marginVertical: spacing.xs },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { fontSize: typography.sizes.sm },
  rateValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  tsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  tsLabel: { flex: 1, fontSize: typography.sizes.sm },
  tsValue: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  actionsDesc: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  actionBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  auditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  auditTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  auditTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  auditEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
  auditEmptyText: { fontSize: typography.sizes.sm },
  auditRow: { flexDirection: 'row', paddingVertical: spacing.sm, gap: spacing.sm },
  auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  auditInfo: { flex: 1, gap: 2 },
  auditTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  auditOutcome: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  auditCode: { fontSize: typography.sizes.xs },
  auditMerchant: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  auditAmount: { fontSize: typography.sizes.xs },
  auditReason: { fontSize: typography.sizes.xs },
  auditTime: { fontSize: typography.sizes.xs },
});
