import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Button, IconButton, Chip, useTheme, type MD3Theme } from 'react-native-paper';
import { spacing } from '../../theme';
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
  getNativeDiagnosticInfo,
  type SmsStats,
  type AuditEntry,
  type RejectionEntry,
} from '../../../modules/lifeos-sms';
import { useDataVersion } from '../../store/dataVersion';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { parseISO } from 'date-fns';

const LAST_CLEARED_ID_KEY = '@sms_audit_log_last_cleared_id';
const WARNING_COLOR = '#F5CB5C';

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <GlassCard style={styles.sectionCard}>
      {title && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600', marginBottom: spacing.xs }}>
          {title}
        </Text>
      )}
      {children}
    </GlassCard>
  );
}

function TimestampRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.tsRow}>
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{label}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{value}</Text>
    </View>
  );
}

function CounterCell({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.counterCell}>
      <Text variant="headlineSmall" style={{ color: valueColor ?? theme.colors.onSurface }}>{value}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

function auditDisplayTimestamp(entry?: AuditEntry): string | null | undefined {
  if (!entry) return undefined;
  if (entry.smsDate && (entry.outcome.startsWith('imported_') || entry.outcome.startsWith('retry_imported'))) {
    return entry.smsDate;
  }
  return entry.createdAt;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    const d = parseISO(iso);
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

function outcomeColor(outcome: string, theme: MD3Theme): string {
  if (outcome.includes('imported') || outcome.includes('realtime') || outcome.includes('retry')) return theme.colors.primary;
  if (outcome.includes('failed') || outcome.includes('error')) return theme.colors.error;
  if (outcome.includes('quarantine')) return WARNING_COLOR;
  if (outcome.includes('duplicate') || outcome.includes('skipped') || outcome.includes('ignored')) return theme.colors.outline;
  if (outcome.includes('fuliza')) return '#FB923C';
  return theme.colors.onSurfaceVariant;
}

function outcomeLabelShort(outcome: string): string {
  if (outcome.startsWith('imported_realtime')) return 'realtime';
  if (outcome.startsWith('imported_scan')) return 'scan';
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
  const theme = useTheme();
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
  const [dbIntegrityMessage, setDbIntegrityMessage] = useState<string | null>(null);
  const [txCount, setTxCount] = useState(0);
  const [repairing, setRepairing] = useState(false);
  const [jsDbPath, setJsDbPath] = useState<string | null>(null);
  const [nativeDiag, setNativeDiag] = useState<{ nativeDbPath: string; nativeTxCount: number; nativeAuditCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastClearedId, setLastClearedId] = useState(0);
  const dataVersion = useDataVersion((s) => s.transactionVersion);

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
      const visible = (await enrichAuditWithSmsDates(db, entries)).filter(
        (e) => (e.id ?? 0) > lastClearedId
      );
      setAuditEntries(visible.slice(0, 10));
      setRejections(recentRejections);
      setReceiverEnabled(receiverStatus.enabled);
      setLastFireMs(receiverStatus.lastFireMs);
      setBatteryExempt(exempt);
      try {
        const integ = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
        const message = integ?.integrity_check ?? 'ok';
        setDbIntegrityMessage(message === 'ok' ? null : message);
        setDbIntegrityOk(message === 'ok');
      } catch {
        setDbIntegrityMessage(null);
        setDbIntegrityOk(true);
      }
      try {
        const txRow = await db.getFirstAsync<{ c: number }>(
          'SELECT COUNT(*) as c FROM transactions WHERE deleted_at IS NULL'
        );
        setTxCount(txRow?.c ?? 0);
      } catch {
        setTxCount(0);
      }
      try {
        const dbList = await db.getFirstAsync<{ name: string; file: string }>('PRAGMA database_list');
        setJsDbPath(dbList?.file ?? null);
      } catch {
        setJsDbPath(null);
      }
      try {
        setNativeDiag(await getNativeDiagnosticInfo());
      } catch {
        setNativeDiag(null);
      }
    } catch (e) {
      console.warn('SmsHealth load error', e);
    } finally {
      setLoading(false);
    }
  }, [db, lastClearedId]);

  useLiveQuery(load);

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
      useDataVersion.getState().bumpTransactions();
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
      useDataVersion.getState().bumpTransactions();
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

  const handleRepairDb = async () => {
    setRepairing(true);
    try {
      try {
        await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch {
        // ignore
      }
      const integ = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
      const message = integ?.integrity_check ?? 'ok';
      setDbIntegrityMessage(message === 'ok' ? null : message);
      setDbIntegrityOk(message === 'ok');
      if (message === 'ok') {
        Alert.alert('Database repaired', 'The integrity check is now passing.');
      } else {
        Alert.alert(
          'Still corrupted',
          `Integrity check result: ${message}\n\nExport your data from Finance → Export, then reinstall the app.`
        );
      }
    } catch (e: any) {
      Alert.alert('Repair check failed', e?.message ?? 'Unknown error');
    } finally {
      setRepairing(false);
    }
  };

  const totalProcessed = (stats?.totalImported ?? 0) + (stats?.totalDuplicates ?? 0) + (stats?.totalFailed ?? 0) + (stats?.totalQuarantined ?? 0);
  const successRate = totalProcessed > 0 ? Math.round(((stats?.totalImported ?? 0) * 100) / totalProcessed) : 0;

  const lastEntry = auditEntries[0];
  const lastImported = auditEntries.find(
    (e) => e.outcome.startsWith('imported_') || e.outcome.startsWith('retry_imported')
  );
  const lastRealtime = auditEntries.find((e) => e.outcome.startsWith('imported_realtime'));
  const lastScan = auditEntries.find((e) => e.outcome.startsWith('imported_scan'));
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
    receiverStatus === 'active' ? theme.colors.primary
    : receiverStatus === 'disabled' ? theme.colors.error
    : receiverStatus === 'idle' ? theme.colors.outline
    : WARNING_COLOR;
  const receiverStatusLabel =
    receiverStatus === 'active' ? 'Active'
    : receiverStatus === 'disabled' ? 'Disabled'
    : receiverStatus === 'idle' ? 'Idle'
    : 'Waiting';
  const lastFireLabel = lastFireMs > 0 ? formatTimestamp(new Date(lastFireMs).toISOString()) : 'Never';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>SMS Import Health</Text>
          <IconButton
            icon={() => <Ionicons name="refresh-outline" size={22} color={loading ? theme.colors.outline : theme.colors.primary} />}
            size={22}
            onPress={load}
            disabled={loading}
            style={{ margin: 0 }}
          />
        </View>

        {/* Receiver Status */}
        <SectionCard title="Receiver Status">
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: `${receiverStatusColor}20` }]}>
              <View style={[styles.statusDotInner, { backgroundColor: receiverStatusColor }]} />
            </View>
            <View style={styles.statusInfo}>
              <View style={styles.statusTitleRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Realtime receiver</Text>
                <Chip style={{ backgroundColor: `${receiverStatusColor}20` }} textStyle={{ color: receiverStatusColor }}>
                  {receiverStatusLabel}
                </Chip>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
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
            <Button
              mode="outlined"
              icon={() => <Ionicons name="battery-half-outline" size={16} color={WARNING_COLOR} />}
              onPress={async () => {
                try {
                  await requestIgnoreBatteryOptimizations();
                  setBatteryExempt(await isIgnoringBatteryOptimizations());
                } catch {}
              }}
              textColor={WARNING_COLOR}
              style={[styles.warnButton, { borderColor: WARNING_COLOR }]}
            >
              Battery optimization is restricting background capture — tap to allow
            </Button>
          )}
          {!dbIntegrityOk && (
            <Button
              mode="outlined"
              icon={() => <Ionicons name="warning-outline" size={16} color={theme.colors.error} />}
              onPress={handleRepairDb}
              disabled={repairing}
              loading={repairing}
              textColor={theme.colors.error}
              style={[styles.warnButton, { borderColor: theme.colors.error }]}
            >
              Database integrity check failed
              {dbIntegrityMessage ? ` — ${dbIntegrityMessage}` : ''}
            </Button>
          )}
          {(ingestQueue.pending > 0 || ingestQueue.failed > 0) && (
            <Button
              mode="outlined"
              icon={() => <Ionicons name="layers-outline" size={16} color={ingestQueue.failed > 0 ? theme.colors.error : WARNING_COLOR} />}
              onPress={async () => {
                try {
                  await retryIngestQueue();
                  setIngestQueue(await getIngestQueueStatus());
                } catch {}
              }}
              textColor={ingestQueue.failed > 0 ? theme.colors.error : WARNING_COLOR}
              style={[styles.warnButton, { borderColor: ingestQueue.failed > 0 ? theme.colors.error : WARNING_COLOR }]}
            >
              {`${ingestQueue.pending} queued`}
              {ingestQueue.failed > 0 ? ` · ${ingestQueue.failed} failed` : ''}
              {ingestQueue.oldestPendingAt ? ` · oldest ${formatTimestamp(ingestQueue.oldestPendingAt)}` : ''}
            </Button>
          )}
        </SectionCard>

        {/* Lifetime Counters */}
        <SectionCard title="Lifetime Counters">
          {loading && !stats ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: spacing.base }} />
          ) : (
            <>
              <View style={styles.countersRow}>
                <CounterCell value={`${stats?.totalImported ?? 0}`} label="Imported" valueColor={theme.colors.primary} />
                <CounterCell value={`${stats?.totalDuplicates ?? 0}`} label="Duplicates" />
                <CounterCell value={`${stats?.totalQuarantined ?? 0}`} label="Quarantined" valueColor={WARNING_COLOR} />
                <CounterCell
                  value={`${stats?.totalFailed ?? 0}`}
                  label="Failed"
                  valueColor={(stats?.totalFailed ?? 0) > 0 ? theme.colors.error : theme.colors.onSurface}
                />
              </View>
              {(stats?.totalImported ?? 0) > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <View style={styles.rateRow}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Parse success rate</Text>
                    <Text variant="bodyMedium" style={{
                      color: successRate >= 90 ? theme.colors.primary : successRate >= 70 ? WARNING_COLOR : theme.colors.error,
                      fontWeight: '600',
                    }}>{successRate}%</Text>
                  </View>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Activity */}
        <SectionCard title="Activity">
          <TimestampRow icon="mail-outline" label="Last SMS activity" value={formatTimestamp(auditDisplayTimestamp(lastEntry))} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <TimestampRow icon="flash-outline" label="Last realtime capture" value={formatTimestamp(auditDisplayTimestamp(lastRealtime))} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <TimestampRow icon="scan-outline" label="Last scan capture" value={formatTimestamp(auditDisplayTimestamp(lastScan))} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <TimestampRow icon="download-outline" label="Last batch import" value={formatTimestamp(auditDisplayTimestamp(lastBatch) ?? stats?.lastImportAt)} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <TimestampRow icon="checkmark-circle-outline" label="Last successful import" value={formatTimestamp(auditDisplayTimestamp(lastImported))} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.tsRow}>
            <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>Transactions in DB</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{txCount}</Text>
          </View>
        </SectionCard>

        {/* Actions */}
        <SectionCard title="Actions">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
            Reconcile re-imports the last 7 days, skipping duplicates. Retry Queue re-parses quarantined messages.
          </Text>
          <View style={styles.actionsRow}>
            <Button
              mode="outlined"
              icon={() => <Ionicons name="sync-outline" size={16} color={theme.colors.primary} />}
              onPress={handleReconcile}
              disabled={reconciling || retrying}
              loading={reconciling}
              style={{ flex: 1 }}
            >
              {reconciling ? 'Running…' : 'Reconcile'}
            </Button>
            <Button
              mode="outlined"
              icon={() => <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />}
              onPress={handleRetryQueue}
              disabled={reconciling || retrying}
              loading={retrying}
              style={{ flex: 1 }}
            >
              {retrying ? 'Running…' : `Retry Queue${(stats?.totalQuarantined ?? 0) > 0 ? ` (${stats!.totalQuarantined})` : ''}`}
            </Button>
          </View>
        </SectionCard>

        {/* Recent Rejections */}
        {rejections.length > 0 && (
          <SectionCard title="Recent Rejections">
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              Messages skipped by the parser and the reason they were rejected.
            </Text>
            {rejections.slice(0, 5).map((r, i) => (
              <View key={i}>
                <View style={styles.auditRow}>
                  <View style={[styles.auditDot, { backgroundColor: theme.colors.error }]} />
                  <View style={styles.auditInfo}>
                    <Text variant="bodySmall" style={{ color: theme.colors.error }} numberOfLines={1}>
                      {rejectionReasonLabel(r.reason)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                      {r.rawSms}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      {formatTimestamp(new Date(r.timestampMs).toISOString())}
                    </Text>
                  </View>
                </View>
                {i < Math.min(rejections.length, 5) - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                )}
              </View>
            ))}
          </SectionCard>
        )}

        {/* Diagnostic paths */}
        <SectionCard title="Diagnostics">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            JS transactions count: {txCount} · native transactions count: {nativeDiag?.nativeTxCount ?? '?'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            JS DB path:
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }} selectable>
            {jsDbPath ?? 'unknown'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Native DB path:
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }} selectable>
            {nativeDiag?.nativeDbPath ?? 'unknown'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Native audit count: {nativeDiag?.nativeAuditCount ?? '?'}
          </Text>
        </SectionCard>

        {/* Audit Log */}
        <SectionCard>
          <View style={styles.auditHeader}>
            <View style={styles.auditTitleRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.onSurface} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Import Log</Text>
              {auditEntries.length > 0 && (
                <Chip style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.onSurface }}>
                  {auditEntries.length}
                </Chip>
              )}
            </View>
            {auditEntries.length > 0 && (
              <Button
                mode="text"
                icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                onPress={handleClearAudit}
                textColor={theme.colors.error}
                compact
              >
                Clear
              </Button>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          {loading && auditEntries.length === 0 ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : auditEntries.length === 0 ? (
            <View style={styles.auditEmpty}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No import activity recorded yet.
              </Text>
            </View>
          ) : (
            auditEntries.map((entry, i) => {
              const dotColor = outcomeColor(entry.outcome, theme);
              return (
                <View key={entry.id}>
                  <View style={styles.auditRow}>
                    <View style={[styles.auditDot, { backgroundColor: dotColor }]} />
                    <View style={styles.auditInfo}>
                      <View style={styles.auditTopRow}>
                        <Text variant="bodySmall" style={{ color: dotColor, fontWeight: '600' }}>
                          {outcomeLabelShort(entry.outcome)}
                        </Text>
                        {entry.mpesaCode && (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{entry.mpesaCode}</Text>
                        )}
                      </View>
                      {entry.merchant && (
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                          {entry.merchant}
                        </Text>
                      )}
                      {entry.amount != null && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Ksh {entry.amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}
                        </Text>
                      )}
                      {entry.failureReason && (
                        <Text variant="bodySmall" style={{ color: theme.colors.error }} numberOfLines={2}>
                          {entry.failureReason}
                        </Text>
                      )}
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        {formatTimestamp(auditDisplayTimestamp(entry))}
                      </Text>
                    </View>
                  </View>
                  {i < auditEntries.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  sectionCard: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  statusDot: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusDotInner: { width: 12, height: 12, borderRadius: 6 },
  statusInfo: { flex: 1 },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusSub: { marginTop: 2 },
  warnButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  countersRow: { flexDirection: 'row', justifyContent: 'space-around' },
  counterCell: { alignItems: 'center', gap: 4 },
  divider: { height: 1, marginVertical: spacing.xs },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  auditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  auditTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  auditEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
  auditRow: { flexDirection: 'row', paddingVertical: spacing.sm, gap: spacing.sm },
  auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  auditInfo: { flex: 1, gap: 2 },
  auditTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
