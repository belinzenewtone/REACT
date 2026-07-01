import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';

type AuditEntry = {
  id: number;
  outcome: string;
  merchant: string | null;
  failure_reason: string | null;
  mpesa_code: string | null;
  imported_at: string;
};

type HealthStats = {
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
};

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

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso ?? 'Never';
  }
}

export function SmsImportHealthScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [stats, setStats] = useState<HealthStats>({ totalImported: 0, totalSkipped: 0, totalErrors: 0 });
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [importedRow, skippedRow, errorRow] = await Promise.all([
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM import_audit WHERE outcome LIKE '%imported%' OR outcome LIKE '%realtime%'`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM import_audit WHERE outcome LIKE '%duplicate%' OR outcome LIKE '%skipped%'`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM import_audit WHERE outcome LIKE '%failed%' OR outcome LIKE '%error%'`),
      ]);
      setStats({
        totalImported: importedRow?.count ?? 0,
        totalSkipped: skippedRow?.count ?? 0,
        totalErrors: errorRow?.count ?? 0,
      });
      const entries = await db.getAllAsync<AuditEntry>(
        `SELECT id, outcome, merchant, failure_reason, mpesa_code, imported_at
         FROM import_audit ORDER BY id DESC LIMIT 50`
      );
      setAuditEntries(entries);
    } catch (e) {
      console.warn('SmsHealth load error', e);
    }
  }

  async function handleClearLog() {
    try {
      await db.runAsync(`DELETE FROM import_audit`);
      setAuditEntries([]);
      setStats({ totalImported: 0, totalSkipped: 0, totalErrors: 0 });
    } catch (e) {
      console.warn('Clear log error', e);
    }
  }

  const total = stats.totalImported + stats.totalSkipped + stats.totalErrors;
  const successRate = total > 0 ? Math.round((stats.totalImported * 100) / total) : 0;

  const lastEntry = auditEntries[0];
  const lastImported = auditEntries.find((e) => e.outcome.includes('imported') || e.outcome.includes('realtime'));

  const receiverStatus: 'active' | 'idle' | 'unknown' = (() => {
    if (!lastEntry) return 'unknown';
    const hoursSinceLastActivity = (Date.now() - new Date(lastEntry.imported_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceLastActivity <= 24 ? 'active' : 'idle';
  })();
  const receiverStatusColor =
    receiverStatus === 'active' ? colors.accentPrimary : receiverStatus === 'idle' ? colors.textTertiary : colors.warning;
  const receiverStatusLabel =
    receiverStatus === 'active' ? 'Active' : receiverStatus === 'idle' ? 'Idle' : 'Unknown';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>SMS Import Health</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Receiver Status */}
        <SectionCard title="Receiver Status" colors={colors}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: receiverStatusColor }]} />
            <View style={styles.statusInfo}>
              <View style={styles.statusTitleRow}>
                <Text style={[styles.statusName, { color: colors.textPrimary }]}>Realtime receiver</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${receiverStatusColor}20` }]}>
                  <Text style={[styles.statusBadgeText, { color: receiverStatusColor }]}>{receiverStatusLabel}</Text>
                </View>
              </View>
              <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                {receiverStatus === 'active'
                  ? 'SMS broadcast receiver is running'
                  : receiverStatus === 'idle'
                  ? 'No recent import activity in the last 24 hours'
                  : 'No import activity recorded yet'}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Lifetime Counters */}
        <SectionCard title="Lifetime Counters" colors={colors}>
          <View style={styles.countersRow}>
            <CounterCell value={`${stats.totalImported}`} label="Imported" valueColor={colors.accentPrimary} colors={colors} />
            <CounterCell value={`${stats.totalSkipped}`} label="Skipped" colors={colors} />
            <CounterCell
              value={`${stats.totalErrors}`}
              label="Errors"
              valueColor={stats.totalErrors > 0 ? colors.danger : colors.textPrimary}
              colors={colors}
            />
          </View>
          {stats.totalImported > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.rateRow}>
                <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>Parse success rate</Text>
                <Text style={[styles.rateValue, {
                  color: successRate >= 90 ? colors.success : successRate >= 70 ? colors.warning : colors.danger,
                }]}>{successRate}%</Text>
              </View>
            </>
          )}
        </SectionCard>

        {/* Activity */}
        <SectionCard title="Activity" colors={colors}>
          <TimestampRow icon="mail-outline" label="Last SMS received" value={formatTimestamp(lastEntry?.imported_at)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="sync-outline" label="Last realtime capture" value={formatTimestamp(lastEntry?.imported_at)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="time-outline" label="Last inbox scan" value={formatTimestamp(lastEntry?.imported_at)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TimestampRow icon="checkmark-circle-outline" label="Last successful import" value={formatTimestamp(lastImported?.imported_at)} colors={colors} />
        </SectionCard>

        {/* Actions */}
        <SectionCard title="Actions" colors={colors}>
          <Text style={[styles.actionsDesc, { color: colors.textSecondary }]}>
            Reconcile re-scans the last 7 days. Retry reprocesses previously failed messages.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, flex: 1 }]}
              onPress={() => {
                setIsReconciling(true);
                setTimeout(() => setIsReconciling(false), 2000);
              }}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Ionicons name="sync-outline" size={16} color={colors.accentPrimary} />
              )}
              <Text style={[styles.actionBtnText, { color: colors.accentPrimary }]}>
                {isReconciling ? 'Running…' : 'Reconcile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, flex: 1 }]}
              disabled={isReconciling}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.accentPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.accentPrimary }]}>Retry Queue</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Audit Log */}
        <SectionCard colors={colors}>
          <View style={styles.auditHeader}>
            <View style={styles.auditTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.auditTitle, { color: colors.textPrimary }]}>Import Audit Log</Text>
              {auditEntries.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.bgTertiary }]}>
                  <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{auditEntries.length}</Text>
                </View>
              )}
            </View>
            {auditEntries.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Clear Audit Log?', 'This removes all recorded import activity.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: handleClearLog },
                  ])
                }
              >
                <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {auditEntries.length === 0 ? (
            <View style={styles.auditEmpty}>
              <Text style={[styles.auditEmptyText, { color: colors.textSecondary }]}>
                No import activity recorded yet.
              </Text>
            </View>
          ) : (
            auditEntries.map((entry, i) => {
              const isSuccess = entry.outcome.includes('imported') || entry.outcome.includes('realtime');
              const isError = entry.outcome.includes('failed') || entry.outcome.includes('error');
              const isSkip = entry.outcome.includes('duplicate') || entry.outcome.includes('skipped');
              const dotColor = isSuccess ? colors.accentPrimary : isError ? colors.danger : colors.textTertiary;

              return (
                <View key={entry.id}>
                  <View style={styles.auditRow}>
                    <View style={[styles.auditDot, { backgroundColor: dotColor }]} />
                    <View style={styles.auditInfo}>
                      <View style={styles.auditTopRow}>
                        <Text style={[styles.auditOutcome, { color: dotColor }]}>{entry.outcome}</Text>
                        {entry.mpesa_code && (
                          <Text style={[styles.auditCode, { color: colors.textSecondary }]}>{entry.mpesa_code}</Text>
                        )}
                      </View>
                      {entry.merchant && (
                        <Text style={[styles.auditMerchant, { color: colors.textPrimary }]}>{entry.merchant}</Text>
                      )}
                      {entry.failure_reason && (
                        <Text style={[styles.auditReason, { color: colors.danger }]}>{entry.failure_reason}</Text>
                      )}
                      <Text style={[styles.auditTime, { color: colors.textTertiary }]}>
                        {formatTimestamp(entry.imported_at)}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  sectionCard: { gap: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  statusDot: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1 },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  statusSub: { fontSize: typography.sizes.sm, marginTop: 2 },
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
  auditTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  clearText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  auditEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
  auditEmptyText: { fontSize: typography.sizes.sm },
  auditRow: { flexDirection: 'row', paddingVertical: spacing.sm, gap: spacing.sm },
  auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  auditInfo: { flex: 1, gap: 2 },
  auditTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  auditOutcome: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  auditCode: { fontSize: typography.sizes.xs },
  auditMerchant: { fontSize: typography.sizes.sm },
  auditReason: { fontSize: typography.sizes.xs },
  auditTime: { fontSize: typography.sizes.xs },
});
