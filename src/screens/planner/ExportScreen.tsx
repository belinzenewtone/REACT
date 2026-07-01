import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { EventRepository } from '../../database/repositories/EventRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { GlassCard } from '../../components/common/GlassCard';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

type ExportFormat = 'csv' | 'json';
type DateWindow = 'week' | 'month' | 'last30' | 'all';

const DATE_WINDOWS: { key: DateWindow; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
];

function getStartDate(window: DateWindow): string | undefined {
  const now = new Date();
  switch (window) {
    case 'week': return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case 'month': return startOfMonth(now).toISOString();
    case 'last30': return subDays(now, 30).toISOString();
    case 'all': return undefined;
  }
}

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colors: any;
}) {
  return (
    <View style={[pillerStyles.bar, { backgroundColor: colors.bgTertiary }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={[pillerStyles.item, active && { backgroundColor: colors.accentPrimary }]}
            onPress={() => onChange(o.key)}
          >
            <Text style={[pillerStyles.label, { color: active ? colors.textInverse : colors.textSecondary }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pillerStyles = StyleSheet.create({
  bar: { flexDirection: 'row', borderRadius: borderRadius.full, padding: 4, gap: 4 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: borderRadius.full },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
});

type DomainCounts = { transactions: number; tasks: number; events: number; budgets: number };

export function ExportScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { exports, loadAll, createExport } = usePlannerStore();

  const [format_, setFormat] = useState<ExportFormat>('csv');
  const [dateWindow, setDateWindow] = useState<DateWindow>('all');
  const [counts, setCounts] = useState<DomainCounts | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const loadCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const since = getStartDate(dateWindow);
      const where = since ? `WHERE (date >= ? OR created_at >= ?) AND deleted_at IS NULL` : `WHERE deleted_at IS NULL`;
      const params = since ? [since, since] : [];

      const txRow = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM transactions ${where}`, params
      );
      const taskRow = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM tasks ${where}`, params
      );
      const eventRow = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM events ${where}`, params
      );
      const budgetRow = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM budgets WHERE deleted_at IS NULL`, []
      );

      setCounts({
        transactions: txRow?.n ?? 0,
        tasks: taskRow?.n ?? 0,
        events: eventRow?.n ?? 0,
        budgets: budgetRow?.n ?? 0,
      });
    } catch (e) {
      console.warn('count error', e);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [db, dateWindow]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const buildCsv = async () => {
    const since = getStartDate(dateWindow);
    const rows = await new TransactionRepository(db).findAll({ limit: 50000, startDate: since });
    const header = ['date', 'merchant', 'category', 'amount', 'type', 'status', 'description', 'mpesa_code'].join(',');
    const lines = rows.map((r) =>
      [
        r.date,
        `"${r.merchant.replace(/"/g, '""')}"`,
        r.category,
        r.amount,
        r.transaction_type,
        r.status,
        r.description ? `"${r.description.replace(/"/g, '""')}"` : '',
        r.mpesa_code || '',
      ].join(',')
    );
    return { content: [header, ...lines].join('\n'), count: lines.length };
  };

  const buildJson = async () => {
    const since = getStartDate(dateWindow);
    const [transactions, tasks, events, budgets] = await Promise.all([
      new TransactionRepository(db).findAll({ limit: 50000, startDate: since }),
      new TaskRepository(db).findAll({ limit: 50000 }),
      new EventRepository(db).findAll(),
      new BudgetRepository(db).findAll(),
    ]);
    return {
      content: JSON.stringify({ transactions, tasks, events, budgets, exportedAt: new Date().toISOString() }, null, 2),
      count: transactions.length + tasks.length + events.length + budgets.length,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format_ === 'csv') {
        const { content, count } = await buildCsv();
        await Share.share({ message: content, title: 'Transactions CSV' });
        await createExport(db, { filePath: 'transactions.csv', format: 'csv', recordCount: count });
      } else {
        const { content, count } = await buildJson();
        await Share.share({ message: content, title: 'Full Data JSON' });
        await createExport(db, { filePath: 'lifeos_export.json', format: 'json', recordCount: count });
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export failed', 'Could not export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const total = counts ? counts.transactions + counts.tasks + counts.events + counts.budgets : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Export</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('CsvImport')}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Format ── */}
        <GlassCard>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FORMAT</Text>
          <PillSelector
            options={[
              { key: 'csv', label: 'CSV' },
              { key: 'json', label: 'JSON' },
            ]}
            value={format_}
            onChange={setFormat}
            colors={colors}
          />
          <Text style={[styles.formatHint, { color: colors.textTertiary }]}>
            {format_ === 'csv'
              ? 'Transactions only — opens in Excel / Google Sheets'
              : 'All data: transactions, tasks, events, budgets'}
          </Text>
        </GlassCard>

        {/* ── Date Window ── */}
        <GlassCard>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE WINDOW</Text>
          <PillSelector
            options={DATE_WINDOWS}
            value={dateWindow}
            onChange={setDateWindow}
            colors={colors}
          />
        </GlassCard>

        {/* ── Export Preview ── */}
        <GlassCard>
          <View style={styles.previewHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EXPORT PREVIEW</Text>
            {isLoadingCounts && <ActivityIndicator size="small" color={colors.accentPrimary} />}
          </View>
          <View style={styles.previewGrid}>
            {([
              { label: 'Transactions', count: counts?.transactions, icon: 'cash-outline', color: colors.accentPrimary },
              { label: 'Tasks', count: counts?.tasks, icon: 'checkbox-outline', color: colors.success },
              { label: 'Events', count: counts?.events, icon: 'calendar-outline', color: colors.warning },
              { label: 'Budgets', count: counts?.budgets, icon: 'wallet-outline', color: '#A78BFA' },
            ] as const).map((d) => (
              <View key={d.label} style={[styles.previewItem, { backgroundColor: colors.bgTertiary }]}>
                <View style={[styles.previewIcon, { backgroundColor: `${d.color}20` }]}>
                  <Ionicons name={d.icon as any} size={18} color={d.color} />
                </View>
                <Text style={[styles.previewCount, { color: colors.textPrimary }]}>
                  {d.count ?? '—'}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{d.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.totalLine, { color: colors.textSecondary }]}>
            {total} record{total !== 1 ? 's' : ''} in scope
          </Text>
        </GlassCard>

        {/* ── Export Button ── */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.accentPrimary, opacity: isExporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={colors.textInverse} />
              <Text style={[styles.exportBtnText, { color: colors.textInverse }]}>
                Export {format_.toUpperCase()}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Export History ── */}
        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Export History</Text>

        {exports.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="archive-outline" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No exports yet</Text>
          </View>
        ) : (
          exports.map((item) => (
            <GlassCard key={item.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={[styles.historyIcon, {
                  backgroundColor: item.format === 'csv' ? `${colors.accentPrimary}20` : `${colors.success}20`,
                }]}>
                  <Ionicons
                    name={item.format === 'csv' ? 'grid-outline' : 'document-text-outline'}
                    size={18}
                    color={item.format === 'csv' ? colors.accentPrimary : colors.success}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyFileName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.file_path}
                  </Text>
                  <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                    {item.format.toUpperCase()} · {item.record_count ?? 0} records · {formatDateTime(item.created_at)}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              </View>
            </GlassCard>
          ))
        )}
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  content: { padding: spacing.lg, gap: spacing.base, paddingBottom: spacing['4xl'] },
  sectionLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
  formatHint: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewGrid: { flexDirection: 'row', gap: spacing.sm },
  previewItem: {
    flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.lg, gap: 4,
  },
  previewIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  previewCount: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  previewLabel: { fontSize: typography.sizes.xs },
  totalLine: { fontSize: typography.sizes.xs, textAlign: 'center', marginTop: spacing.sm },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + 2,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  exportBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  historyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: spacing.sm },
  emptyHistory: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  emptyText: { fontSize: typography.sizes.base },
  historyCard: { marginBottom: 0 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyFileName: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  historyMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
