import React, { useEffect, useState } from 'react';
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
import { formatCurrency } from '../../utils/formatters';
import { GlassCard } from '../../components/common/GlassCard';

type AuditEntry = {
  id: number;
  outcome: string;
  raw_message: string;
  amount: number | null;
  merchant: string | null;
  failure_reason: string | null;
  mpesa_code: string | null;
};

function OutcomeChip({ outcome, colors }: { outcome: string; colors: any }) {
  let label = outcome;
  let color = colors.textSecondary;

  if (outcome.includes('quarantine')) { label = 'Quarantined'; color = colors.danger; }
  else if (outcome.includes('review')) { label = 'Review'; color = colors.accentSecondary; }
  else if (outcome.includes('batch') || outcome.includes('pending')) { label = 'Pending'; color = colors.accentPrimary; }

  return <Text style={[styles.chip, { color }]}>{label}</Text>;
}

function EntryCard({
  entry,
  isProcessing,
  onApprove,
  onDismiss,
  colors,
}: {
  entry: AuditEntry;
  isProcessing: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  colors: any;
}) {
  return (
    <GlassCard style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <OutcomeChip outcome={entry.outcome} colors={colors} />
        {entry.amount != null && (
          <Text style={[styles.entryAmount, { color: colors.textPrimary }]}>
            Ksh {entry.amount.toFixed(2)}
          </Text>
        )}
      </View>
      {entry.merchant && (
        <Text style={[styles.entryMerchant, { color: colors.textPrimary }]}>{entry.merchant}</Text>
      )}
      <Text style={[styles.entryRaw, { color: colors.textSecondary }]} numberOfLines={3}>
        {entry.raw_message?.substring(0, 120)}
      </Text>
      {entry.failure_reason && (
        <Text style={[styles.entryReason, { color: colors.danger }]}>
          Reason: {entry.failure_reason}
        </Text>
      )}
      <View style={styles.entryActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accentPrimary }]}
          onPress={onApprove}
          disabled={isProcessing}
        >
          <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>Recover</Text>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const rows = await db.getAllAsync<AuditEntry>(
        `SELECT id, outcome, raw_message, amount, merchant, failure_reason, mpesa_code
         FROM import_audit
         WHERE outcome IN ('review', 'quarantine', 'batch_pending', 'pending')
         ORDER BY id DESC
         LIMIT 100`
      );
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(id: number) {
    setIsProcessing(true);
    try {
      await db.runAsync(`UPDATE import_audit SET outcome = 'recovered' WHERE id = ?`, [id]);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setMessage('Transaction recovered.');
    } catch {
      setMessage('Recovery failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDismiss(id: number) {
    setIsProcessing(true);
    try {
      await db.runAsync(`UPDATE import_audit SET outcome = 'dismissed' WHERE id = ?`, [id]);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setMessage('Dismiss failed.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApproveAll() {
    Alert.alert('Recover all?', `This will recover all ${entries.length} transactions.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Recover all',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await db.runAsync(
              `UPDATE import_audit SET outcome = 'recovered' WHERE outcome IN ('review','quarantine','batch_pending','pending')`
            );
            setEntries([]);
            setMessage(`${entries.length} transactions recovered.`);
          } catch {
            setMessage('Bulk recover failed.');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  }

  async function handleDismissAll() {
    Alert.alert('Dismiss all?', `This will dismiss all ${entries.length} pending entries.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss all',
        style: 'destructive',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await db.runAsync(
              `UPDATE import_audit SET outcome = 'dismissed' WHERE outcome IN ('review','quarantine','batch_pending','pending')`
            );
            setEntries([]);
          } catch {
            setMessage('Bulk dismiss failed.');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Review Queue</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {entries.length} pending
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {message && (
        <View style={[styles.banner, { backgroundColor: message.includes('failed') ? colors.danger : colors.success }]}>
          <Text style={[styles.bannerText, { color: '#fff' }]}>{message}</Text>
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
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Queue clear</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            No transactions are pending review.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <GlassCard style={styles.bulkCard}>
              <Text style={[styles.bulkLabel, { color: colors.textSecondary }]}>
                {entries.length} transactions need review
              </Text>
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.accentPrimary, flex: 1 }]}
                  onPress={handleApproveAll}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>Recover all</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn, { flex: 1, borderColor: colors.danger }]}
                  onPress={handleDismissAll}
                  disabled={isProcessing}
                >
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>Dismiss all</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          }
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              isProcessing={isProcessing}
              onApprove={() => handleApprove(item.id)}
              onDismiss={() => handleDismiss(item.id)}
              colors={colors}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm },
  list: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.sm },
  bulkCard: { marginBottom: spacing.sm },
  bulkLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  bulkActions: { flexDirection: 'row', gap: spacing.sm },
  entryCard: { marginBottom: 0 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  chip: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  entryAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  entryMerchant: { fontSize: typography.sizes.base, marginBottom: spacing.xs },
  entryRaw: { fontSize: typography.sizes.xs, fontFamily: 'monospace', marginBottom: spacing.xs },
  entryReason: { fontSize: typography.sizes.xs, marginBottom: spacing.sm },
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bannerText: { fontSize: typography.sizes.sm, flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center' },
});
