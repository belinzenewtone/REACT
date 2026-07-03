import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import {
  getAuditLog,
  retryQuarantined,
  retrySingle,
  type AuditEntry,
} from '../../../modules/lifeos-sms';
import { useDataVersion } from '../../store/dataVersion';

// Outcomes that indicate this entry needs review / recovery
const PENDING_OUTCOMES = new Set([
  'quarantined',
  'imported_review',
  'batch_pending',
  'pending',
]);

function isPending(outcome: string): boolean {
  for (const o of PENDING_OUTCOMES) {
    if (outcome.includes(o)) return true;
  }
  return false;
}

function OutcomeChip({ outcome, colors }: { outcome: string; colors: any }) {
  let label = outcome;
  let color = colors.textSecondary;

  if (outcome.includes('quarantine')) { label = 'Quarantined'; color = colors.danger; }
  else if (outcome.includes('review')) { label = 'Review'; color = colors.warning; }
  else if (outcome.includes('batch') || outcome.includes('pending')) { label = 'Pending'; color = colors.accentPrimary; }

  return <Text style={[styles.chip, { color }]}>{label}</Text>;
}

function EntryCard({
  entry,
  isProcessing,
  onRecover,
  onDismiss,
  colors,
}: {
  entry: AuditEntry;
  isProcessing: boolean;
  onRecover: () => void;
  onDismiss: () => void;
  colors: any;
}) {
  return (
    <GlassCard style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <OutcomeChip outcome={entry.outcome} colors={colors} />
        {entry.amount != null && (
          <Text style={[styles.entryAmount, { color: colors.textPrimary }]}>
            Ksh {entry.amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>
      {entry.merchant && (
        <Text style={[styles.entryMerchant, { color: colors.textPrimary }]}>{entry.merchant}</Text>
      )}
      <Text style={[styles.entryRaw, { color: colors.textSecondary }]} numberOfLines={3}>
        {entry.rawMessage?.substring(0, 140)}
      </Text>
      {entry.failureReason && (
        <Text style={[styles.entryReason, { color: colors.danger }]}>
          {entry.failureReason}
        </Text>
      )}
      <View style={styles.entryMeta}>
        {entry.mpesaCode && (
          <Text style={[styles.metaCode, { color: colors.textTertiary }]}>{entry.mpesaCode}</Text>
        )}
        {entry.confidence && (
          <Text style={[styles.metaConf, { color: colors.textTertiary }]}>conf:{entry.confidence}</Text>
        )}
      </View>
      <View style={styles.entryActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accentPrimary }]}
          onPress={onRecover}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>Recover</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.dismissBtn, { borderColor: colors.danger }]}
          onPress={onDismiss}
          disabled={isProcessing}
        >
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

export function ReviewQueueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load last 200 audit entries and filter to those needing action
      const all = await getAuditLog(200);
      setEntries(all.filter((e) => isPending(e.outcome)));
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const handleRecover = async (entry: AuditEntry) => {
    setProcessingId(entry.id);
    try {
      const result = await retrySingle(entry.id);
      if (result.ok || result.note === 'already_exists') {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        useDataVersion.getState().bump();
        setMessage({ text: result.note === 'already_exists' ? 'Already in ledger — marked complete.' : 'Transaction recovered.', ok: true });
      } else {
        setMessage({ text: `Could not recover: ${result.error ?? 'still quarantined'}`, ok: false });
      }
    } catch (e: any) {
      setMessage({ text: e?.message ?? 'Recovery failed.', ok: false });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (entry: AuditEntry) => {
    setProcessingId(entry.id);
    try {
      // Mark dismissed in the audit table via direct SQLite (no native API needed for dismiss)
      await db.runAsync(`UPDATE import_audit SET outcome = 'dismissed' WHERE id = ?`, [entry.id]);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch {
      setMessage({ text: 'Dismiss failed.', ok: false });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRecoverAll = () => {
    Alert.alert('Recover all?', `Re-parse all ${entries.length} entries and import those that pass the confidence threshold.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Recover all',
        onPress: async () => {
          setBulkProcessing(true);
          try {
            const result = await retryQuarantined();
            useDataVersion.getState().bump();
            await load();
            setMessage({ text: `Reprocessed ${result.retried} · ${result.imported} recovered`, ok: true });
          } catch {
            setMessage({ text: 'Bulk recover failed.', ok: false });
          } finally {
            setBulkProcessing(false);
          }
        },
      },
    ]);
  };

  const handleDismissAll = () => {
    Alert.alert('Dismiss all?', `Remove all ${entries.length} pending entries from the review queue.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss all',
        style: 'destructive',
        onPress: async () => {
          setBulkProcessing(true);
          try {
            await db.runAsync(
              `UPDATE import_audit SET outcome = 'dismissed'
               WHERE outcome IN ('quarantined','imported_review','batch_pending','pending')`
            );
            setEntries([]);
            setMessage({ text: 'All entries dismissed.', ok: true });
          } catch {
            setMessage({ text: 'Bulk dismiss failed.', ok: false });
          } finally {
            setBulkProcessing(false);
          }
        },
      },
    ]);
  };

  const isAnyProcessing = processingId !== null || bulkProcessing;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {message && (
        <View style={[styles.banner, { backgroundColor: message.ok ? colors.accentPrimary : colors.danger }]}>
          <Text style={[styles.bannerText, { color: '#fff' }]}>{message.text}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentPrimary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.full}>
          <ReviewQueueHeader entries={entries} colors={colors} onBack={() => navigation.goBack()} />
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.accentPrimary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Queue clear</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              No transactions are waiting for review.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <ReviewQueueHeader entries={entries} colors={colors} onBack={() => navigation.goBack()} />
              <GlassCard style={styles.bulkCard}>
                <Text style={[styles.bulkLabel, { color: colors.textSecondary }]}>
                  {entries.length} transaction{entries.length !== 1 ? 's' : ''} need review
                </Text>
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.accentPrimary, flex: 1, opacity: isAnyProcessing ? 0.6 : 1 }]}
                    onPress={handleRecoverAll}
                    disabled={isAnyProcessing}
                  >
                    {bulkProcessing ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>Recover all</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.dismissBtn, { flex: 1, borderColor: colors.danger, opacity: isAnyProcessing ? 0.6 : 1 }]}
                    onPress={handleDismissAll}
                    disabled={isAnyProcessing}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>Dismiss all</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </>
          }
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              isProcessing={processingId === item.id}
              onRecover={() => handleRecover(item)}
              onDismiss={() => handleDismiss(item)}
              colors={colors}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

function ReviewQueueHeader({
  entries,
  colors,
  onBack,
}: {
  entries: AuditEntry[];
  colors: any;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Review Queue</Text>
        {entries.length > 0 && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {entries.length} pending
          </Text>
        )}
      </View>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  full: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm },
  list: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  bulkCard: { marginBottom: spacing.xs },
  bulkLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  bulkActions: { flexDirection: 'row', gap: spacing.sm },
  entryCard: { marginBottom: 0 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  chip: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  entryAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  entryMerchant: { fontSize: typography.sizes.base, marginBottom: spacing.xs },
  entryRaw: { fontSize: typography.sizes.xs, fontFamily: 'monospace', marginBottom: spacing.xs },
  entryReason: { fontSize: typography.sizes.xs, marginBottom: spacing.xs, color: 'red' },
  entryMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metaCode: { fontSize: typography.sizes.xs },
  metaConf: { fontSize: typography.sizes.xs },
  entryActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  actionBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  bannerText: { fontSize: typography.sizes.sm, flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
});
