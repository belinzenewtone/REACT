import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, Button, Chip, IconButton, useTheme } from 'react-native-paper';
import { GlassCard } from '../../components/common/GlassCard';
import {
  getAuditLog,
  retryQuarantined,
  retrySingle,
  type AuditEntry,
} from '../../../modules/lifeos-sms';
import { useDataVersion } from '../../store/dataVersion';
import { nowIso } from '../../database';
import { spacing } from '../../theme';

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

function OutcomeChip({ outcome }: { outcome: string }) {
  const theme = useTheme();
  let label = outcome;
  let color = theme.colors.onSurfaceVariant;

  if (outcome.includes('quarantine')) { label = 'Quarantined'; color = theme.colors.error; }
  else if (outcome.includes('review')) { label = 'Review'; color = '#F5CB5C'; }
  else if (outcome.includes('batch') || outcome.includes('pending')) { label = 'Pending'; color = theme.colors.primary; }

  return <Chip style={{ backgroundColor: `${color}20` }} textStyle={{ color }}>{label}</Chip>;
}

function EntryCard({
  entry,
  isProcessing,
  onRecover,
  onDismiss,
}: {
  entry: AuditEntry;
  isProcessing: boolean;
  onRecover: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const isReview = entry.outcome.includes('review');
  return (
    <GlassCard style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <OutcomeChip outcome={entry.outcome} />
        {entry.amount != null && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            Ksh {entry.amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>
      {entry.merchant && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{entry.merchant}</Text>
      )}
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={3}>
        {entry.rawMessage?.substring(0, 140)}
      </Text>
      {isReview && (
        <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
          Already in your ledger — tap Approve to confirm.
        </Text>
      )}
      {entry.failureReason && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {entry.failureReason}
        </Text>
      )}
      <View style={styles.entryMeta}>
        {entry.mpesaCode && (
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{entry.mpesaCode}</Text>
        )}
        {entry.confidence && (
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>conf:{entry.confidence}</Text>
        )}
      </View>
      <View style={styles.entryActions}>
        <Button
          mode="contained"
          onPress={onRecover}
          disabled={isProcessing}
          loading={isProcessing}
          style={{ flex: 1 }}
        >
          {isReview ? 'Approve' : 'Recover'}
        </Button>
        <Button
          mode="outlined"
          onPress={onDismiss}
          disabled={isProcessing}
          textColor={theme.colors.error}
          style={{ flex: 1 }}
        >
          Dismiss
        </Button>
      </View>
    </GlassCard>
  );
}

export function ReviewQueueScreen() {
  const theme = useTheme();
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

  const approveReviewEntry = async (entry: AuditEntry) => {
    const now = nowIso();
    if (entry.mpesaCode) {
      await db.runAsync(
        `UPDATE transactions SET sync_state = 'pending', updated_at = ? WHERE mpesa_code = ? AND deleted_at IS NULL`,
        [now, entry.mpesaCode]
      );
    } else if (entry.rawMessage) {
      await db.runAsync(
        `UPDATE transactions SET sync_state = 'pending', updated_at = ? WHERE raw_sms = ? AND deleted_at IS NULL`,
        [now, entry.rawMessage]
      );
    }
    await db.runAsync(`UPDATE import_audit SET outcome = 'imported_review_approved' WHERE id = ?`, [entry.id]);
  };

  const dismissEntry = async (entry: AuditEntry) => {
    const now = nowIso();
    if (entry.mpesaCode) {
      await db.runAsync(
        `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE mpesa_code = ? AND deleted_at IS NULL`,
        [now, now, entry.mpesaCode]
      );
    } else if (entry.rawMessage) {
      await db.runAsync(
        `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE raw_sms = ? AND deleted_at IS NULL`,
        [now, now, entry.rawMessage]
      );
    }
    await db.runAsync(`UPDATE import_audit SET outcome = 'dismissed' WHERE id = ?`, [entry.id]);
  };

  const handleRecover = async (entry: AuditEntry) => {
    setProcessingId(entry.id);
    try {
      if (entry.outcome.includes('quarantine')) {
        const result = await retrySingle(entry.id);
        if (result.ok || result.note?.startsWith('already_exists')) {
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          useDataVersion.getState().bump();
          setMessage({ text: result.note?.startsWith('already_exists') ? 'Already in ledger — marked complete.' : 'Transaction recovered.', ok: true });
        } else {
          setMessage({ text: `Could not recover: ${result.error ?? 'still quarantined'}`, ok: false });
        }
      } else if (entry.outcome.includes('review')) {
        await approveReviewEntry(entry);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        useDataVersion.getState().bump();
        setMessage({ text: 'Transaction approved — already in your ledger.', ok: true });
      } else {
        await dismissEntry(entry);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setMessage({ text: 'Entry dismissed.', ok: true });
      }
    } catch (e: any) {
      setMessage({ text: e?.message ?? 'Action failed.', ok: false });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (entry: AuditEntry) => {
    setProcessingId(entry.id);
    try {
      await dismissEntry(entry);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      useDataVersion.getState().bump();
      setMessage({ text: 'Dismissed.', ok: true });
    } catch (e: any) {
      setMessage({ text: e?.message ?? 'Dismiss failed.', ok: false });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRecoverAll = () => {
    Alert.alert('Recover all?', `Re-parse all ${entries.length} entries and import/approve those that pass the confidence threshold.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Recover all',
        onPress: async () => {
          setBulkProcessing(true);
          try {
            const quarantined = entries.filter((e) => e.outcome.includes('quarantine'));
            const review = entries.filter((e) => e.outcome.includes('review'));
            let recovered = 0;
            if (quarantined.length > 0) {
              const result = await retryQuarantined();
              recovered += result.imported;
            }
            if (review.length > 0) {
              for (const entry of review) {
                await approveReviewEntry(entry);
                recovered++;
              }
            }
            useDataVersion.getState().bump();
            await load();
            setMessage({ text: `${recovered} entries approved/recovered`, ok: true });
          } catch (e: any) {
            setMessage({ text: e?.message ?? 'Bulk recover failed.', ok: false });
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
            for (const entry of entries) {
              await dismissEntry(entry);
            }
            setEntries([]);
            useDataVersion.getState().bump();
            setMessage({ text: 'All entries dismissed.', ok: true });
          } catch (e: any) {
            setMessage({ text: e?.message ?? 'Bulk dismiss failed.', ok: false });
          } finally {
            setBulkProcessing(false);
          }
        },
      },
    ]);
  };

  const isAnyProcessing = processingId !== null || bulkProcessing;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {message && (
        <View style={[styles.banner, { backgroundColor: message.ok ? theme.colors.primary : theme.colors.error }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary, flex: 1 }}>{message.text}</Text>
          <IconButton
            icon={() => <Ionicons name="close" size={16} color={theme.colors.onPrimary} />}
            size={16}
            onPress={() => setMessage(null)}
            style={{ margin: 0 }}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.full}>
          <ReviewQueueHeader entries={entries} onBack={() => navigation.goBack()} />
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={56} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Queue clear</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No transactions are waiting for review.
            </Text>
          </View>
        </View>
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <ReviewQueueHeader entries={entries} onBack={() => navigation.goBack()} />
              <GlassCard style={styles.bulkCard}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                  {entries.length} transaction{entries.length !== 1 ? 's' : ''} need review
                </Text>
                <View style={styles.bulkActions}>
                  <Button
                    mode="contained"
                    onPress={handleRecoverAll}
                    disabled={isAnyProcessing}
                    loading={bulkProcessing}
                    style={{ flex: 1 }}
                  >
                    Recover all
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleDismissAll}
                    disabled={isAnyProcessing}
                    textColor={theme.colors.error}
                    style={{ flex: 1 }}
                  >
                    Dismiss all
                  </Button>
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
  onBack,
}: {
  entries: AuditEntry[];
  onBack: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <IconButton
        icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
        size={24}
        onPress={onBack}
        style={{ margin: 0 }}
      />
      <View style={styles.headerCenter}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Review Queue</Text>
        {entries.length > 0 && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {entries.length} pending
          </Text>
        )}
      </View>
      <View style={{ width: 44 }} />
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
  list: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  bulkCard: { marginBottom: spacing.xs },
  bulkActions: { flexDirection: 'row', gap: spacing.sm },
  entryCard: { marginBottom: 0 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  entryMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  entryActions: { flexDirection: 'row', gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
});
