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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import CryptoJS from 'crypto-js';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { EventRepository } from '../../database/repositories/EventRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { IncomeRepository } from '../../database/repositories/IncomeRepository';
import { RecurringRuleRepository } from '../../database/repositories/RecurringRuleRepository';
import { GlassCard } from '../../components/common/GlassCard';
import { LifeOSSwitch } from '../../components/common/LifeOSSwitch';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

type ExportFormat = 'csv' | 'json' | 'pdf';
type DateWindow = 'week' | 'month' | 'last30' | 'custom' | 'all';

const DATE_WINDOWS: { key: DateWindow; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom Range' },
  { key: 'all', label: 'All Time' },
];

const FORMAT_OPTIONS: { key: ExportFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'csv', label: 'CSV', icon: 'grid-outline' },
  { key: 'json', label: 'JSON', icon: 'document-text-outline' },
  { key: 'pdf', label: 'PDF', icon: 'document-outline' },
];

const PREVIEW_DOMAINS = [
  { key: 'transactions', label: 'Transactions', icon: 'cash-outline' as const, color: '#4DB8FF' },
  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline' as const, color: '#34D399' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' as const, color: '#F59E0B' },
  { key: 'budgets', label: 'Budgets', icon: 'wallet-outline' as const, color: '#A78BFA' },
  { key: 'incomes', label: 'Incomes', icon: 'trending-up-outline' as const, color: '#22C55E' },
  { key: 'recurring', label: 'Recurring', icon: 'repeat-outline' as const, color: '#06B6D4' },
  { key: 'goals', label: 'Goals', icon: 'flag-outline' as const, color: '#EC4899' },
];

function getDateRange(window: DateWindow, customFrom?: Date, customTo?: Date): { start?: string; end?: string } {
  const now = new Date();
  switch (window) {
    case 'week': {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      s.setHours(0, 0, 0, 0);
      return { start: s.toISOString() };
    }
    case 'month': {
      const s = startOfMonth(now);
      s.setHours(0, 0, 0, 0);
      return { start: s.toISOString() };
    }
    case 'last30': {
      const s = subDays(now, 30);
      s.setHours(0, 0, 0, 0);
      return { start: s.toISOString() };
    }
    case 'custom': {
      if (customFrom) {
        const s = new Date(customFrom);
        s.setHours(0, 0, 0, 0);
        const e = customTo ? new Date(customTo) : new Date(now);
        e.setHours(23, 59, 59, 999);
        return { start: s.toISOString(), end: e.toISOString() };
      }
      return {};
    }
    case 'all':
    default:
      return {};
  }
}

function ExportDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  colors,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.key === value)?.label ?? value;

  return (
    <View>
      <TouchableOpacity
        style={[dropdownStyles.trigger, { backgroundColor: colors.bgTertiary }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[dropdownStyles.triggerText, { color: colors.textPrimary }]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={dropdownStyles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[dropdownStyles.sheet, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={[dropdownStyles.sheetLabel, { color: colors.textSecondary }]}>{label}</Text>
            {options.map((o, i) => {
              const active = o.key === value;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[
                    dropdownStyles.option,
                    active && { backgroundColor: `${colors.accentPrimary}15` },
                    i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                >
                  <Text style={[dropdownStyles.optionText, { color: active ? colors.accentPrimary : colors.textPrimary }]}>
                    {o.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={colors.accentPrimary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  triggerText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  sheetLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.8,
    marginBottom: spacing.base,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});

type DomainCounts = Record<string, number>;

export function ExportScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { exports, loadAll, createExport } = usePlannerStore();

  const [format_, setFormat] = useState<ExportFormat>('csv');
  const [dateWindow, setDateWindow] = useState<DateWindow>('all');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [counts, setCounts] = useState<DomainCounts | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const loadCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const { start, end } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
      const clauses: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      if (start) { clauses.push('(date >= ? OR created_at >= ?)'); params.push(start, start); }
      if (end) { clauses.push('(date <= ? OR created_at <= ?)'); params.push(end, end); }
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

      const [tx, task, event, budget, income, recurring, goal] = await Promise.all([
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM transactions ${where}`, params),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM tasks ${where}`, params),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM events ${where}`, params),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM budgets WHERE deleted_at IS NULL`, []),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM incomes ${where}`, params),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM recurring_rules ${where}`, params),
        db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM goals WHERE deleted_at IS NULL`, []),
      ]);

      setCounts({
        transactions: tx?.n ?? 0,
        tasks: task?.n ?? 0,
        events: event?.n ?? 0,
        budgets: budget?.n ?? 0,
        incomes: income?.n ?? 0,
        recurring: recurring?.n ?? 0,
        goals: goal?.n ?? 0,
      });
    } catch (e) {
      console.warn('count error', e);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [db, dateWindow, customFrom, customTo]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handleDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (showDatePicker === 'from' && date) setCustomFrom(date);
    if (showDatePicker === 'to' && date) setCustomTo(date);
    if (Platform.OS !== 'ios') setShowDatePicker(null); // Android auto-dismisses
  };

  const buildCsv = async () => {
    const { start } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    const rows = await new TransactionRepository(db).findAll({ limit: 50000, startDate: start });
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
    const { start } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    const [transactions, tasks, events, budgets] = await Promise.all([
      new TransactionRepository(db).findAll({ limit: 50000, startDate: start }),
      new TaskRepository(db).findAll({ limit: 50000 }),
      new EventRepository(db).findAll(),
      new BudgetRepository(db).findAll(),
    ]);
    return {
      content: JSON.stringify({ transactions, tasks, events, budgets, exportedAt: new Date().toISOString() }, null, 2),
      count: transactions.length + tasks.length + events.length + budgets.length,
    };
  };

  const buildPdfText = async () => {
    const { start } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    const [transactions, tasks, events, budgets] = await Promise.all([
      new TransactionRepository(db).findAll({ limit: 50000, startDate: start }),
      new TaskRepository(db).findAll({ limit: 50000 }),
      new EventRepository(db).findAll(),
      new BudgetRepository(db).findAll(),
    ]);

    const lines: string[] = [];
    const nowStr = new Date().toISOString().split('T')[0];
    lines.push('='.repeat(50));
    lines.push(`  LifeOS Data Export — ${nowStr}`);
    lines.push('='.repeat(50));
    lines.push('');

    lines.push(`Transactions (${transactions.length}):`);
    lines.push('-'.repeat(40));
    for (const tx of transactions) {
      lines.push(`  ${tx.date.split('T')[0]}  ${tx.merchant.padEnd(30)}  KES ${tx.amount.toFixed(2)}  [${tx.category}]`);
    }
    lines.push('');

    lines.push(`Tasks (${tasks.length}):`);
    lines.push('-'.repeat(40));
    for (const t of tasks) {
      lines.push(`  [${t.status}]  ${t.title}  ${t.priority}`);
    }
    lines.push('');

    lines.push(`Events (${events.length}):`);
    lines.push('-'.repeat(40));
    for (const e of events) {
      lines.push(`  ${e.date.split('T')[0]}  ${e.title}  (${e.type})`);
    }
    lines.push('');

    lines.push(`Budgets (${budgets.length}):`);
    lines.push('-'.repeat(40));
    for (const b of budgets) {
      lines.push(`  ${b.category.padEnd(20)}  Limit: KES ${b.limit_amount}`);
    }
    lines.push('');
    lines.push('='.repeat(50));
    lines.push('  Generated by LifeOS');
    lines.push('='.repeat(50));

    return { content: lines.join('\n'), count: transactions.length + tasks.length + events.length + budgets.length };
  };

  const applyEncryption = (content: string) =>
    encryptEnabled ? CryptoJS.AES.encrypt(content, passphrase).toString() : content;

  const handleExport = async () => {
    if (encryptEnabled && !passphrase.trim()) {
      Alert.alert('Passphrase required', 'Enter a passphrase to encrypt this export, or turn off encryption.');
      return;
    }

    setIsExporting(true);
    try {
      if (format_ === 'csv') {
        const { content, count } = await buildCsv();
        const fileName = encryptEnabled ? 'transactions.csv.enc' : 'transactions.csv';
        await Share.share({ message: applyEncryption(content), title: encryptEnabled ? 'Transactions CSV (Encrypted)' : 'Transactions CSV' });
        await createExport(db, { filePath: fileName, format: 'csv', recordCount: count });
      } else if (format_ === 'json') {
        const { content, count } = await buildJson();
        const fileName = encryptEnabled ? 'lifeos_export.json.enc' : 'lifeos_export.json';
        await Share.share({ message: applyEncryption(content), title: encryptEnabled ? 'Full Data JSON (Encrypted)' : 'Full Data JSON' });
        await createExport(db, { filePath: fileName, format: 'json', recordCount: count });
      } else {
        const { content, count } = await buildPdfText();
        const baseTitle = `LifeOS_Export_${new Date().toISOString().split('T')[0]}.txt`;
        const title = encryptEnabled ? `${baseTitle}.enc` : baseTitle;
        await Share.share({ message: applyEncryption(content), title });
        await createExport(db, { filePath: title, format: 'pdf', recordCount: count });
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export failed', 'Could not export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const total = counts
    ? Object.values(counts).reduce((sum, c) => sum + (c ?? 0), 0)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Export</Text>
          <View style={styles.backBtn} />
        </View>

        {/* ── Format ── */}
        <GlassCard>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FORMAT</Text>
          <View style={styles.formatGrid}>
            {FORMAT_OPTIONS.map((opt) => {
              const active = format_ === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.formatBtn,
                    {
                      backgroundColor: active ? colors.accentPrimary : colors.bgTertiary,
                      borderColor: active ? colors.accentPrimary : colors.border,
                    },
                  ]}
                  onPress={() => setFormat(opt.key)}
                >
                  <Ionicons name={opt.icon} size={18} color={active ? colors.textInverse : colors.textSecondary} />
                  <Text style={[styles.formatBtnText, { color: active ? colors.textInverse : colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.formatHint, { color: colors.textTertiary }]}>
            {format_ === 'csv'
              ? 'Transactions only — opens in Excel / Google Sheets'
              : format_ === 'json'
                ? 'All data: transactions, tasks, events, budgets'
                : 'Formatted document — share or save as PDF'}
          </Text>
        </GlassCard>

        {/* ── Date Window (dropdown) ── */}
        <GlassCard>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE WINDOW</Text>
          <ExportDropdown
            label="DATE WINDOW"
            options={DATE_WINDOWS}
            value={dateWindow}
            onChange={(v) => { setDateWindow(v); if (v !== 'custom') { setCustomFrom(null); setCustomTo(null); } }}
            colors={colors}
          />
          {dateWindow === 'custom' && (
            <View style={styles.customDateRow}>
              <TouchableOpacity
                style={[styles.dateField, { backgroundColor: colors.bgTertiary }]}
                onPress={() => setShowDatePicker('from')}
              >
                <Text style={[styles.dateFieldLabel, { color: colors.textTertiary }]}>From</Text>
                <Text style={[styles.dateFieldValue, { color: colors.textPrimary }]}>
                  {customFrom ? format(customFrom, 'MMM d, yyyy') : 'Select'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              <TouchableOpacity
                style={[styles.dateField, { backgroundColor: colors.bgTertiary }]}
                onPress={() => setShowDatePicker('to')}
              >
                <Text style={[styles.dateFieldLabel, { color: colors.textTertiary }]}>To</Text>
                <Text style={[styles.dateFieldValue, { color: colors.textPrimary }]}>
                  {customTo ? format(customTo, 'MMM d, yyyy') : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={showDatePicker === 'from' ? (customFrom ?? new Date()) : (customTo ?? new Date())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </GlassCard>

        {/* ── Encrypt file ── */}
        <GlassCard>
          <View style={styles.encryptRow}>
            <View style={styles.encryptInfo}>
              <Text style={[styles.encryptLabel, { color: colors.textPrimary }]}>Encrypt file</Text>
              <Text style={[styles.encryptHint, { color: colors.textTertiary }]}>
                Protect the export with a passphrase
              </Text>
            </View>
            <LifeOSSwitch value={encryptEnabled} onValueChange={setEncryptEnabled} />
          </View>
          {encryptEnabled && (
            <TextInput
              style={[styles.passphraseInput, { backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter passphrase"
              placeholderTextColor={colors.textTertiary}
              value={passphrase}
              onChangeText={setPassphrase}
              secureTextEntry
            />
          )}
        </GlassCard>

        {/* ── Export Preview ── */}
        <GlassCard>
          <View style={styles.previewHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EXPORT PREVIEW</Text>
            <View style={styles.previewHeaderRight}>
              {isLoadingCounts && <ActivityIndicator size="small" color={colors.accentPrimary} />}
              {counts && (
                <Text style={[styles.previewTotal, { color: colors.textSecondary }]}>
                  Total items: {total}
                </Text>
              )}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.previewGrid}>
              {PREVIEW_DOMAINS.map((d) => (
                <View key={d.key} style={[styles.previewItem, { backgroundColor: colors.bgTertiary }]}>
                  <View style={[styles.previewIcon, { backgroundColor: `${d.color}20` }]}>
                    <Ionicons name={d.icon} size={18} color={d.color} />
                  </View>
                  <Text style={[styles.previewCount, { color: colors.textPrimary }]}>
                    {counts?.[d.key] ?? '—'}
                  </Text>
                  <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
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
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Export History</Text>
          {exports.length > 0 && (
            <TouchableOpacity onPress={() => Alert.alert('Clear history', 'Clear all export history?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: async () => {
                await db.runAsync('DELETE FROM exports');
                loadAll(db);
              }},
            ])}>
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

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
                  backgroundColor: item.format === 'csv' ? `${colors.accentPrimary}20`
                    : item.format === 'json' ? `${colors.success}20`
                    : `${colors.warning}20`,
                }]}>
                  <Ionicons
                    name={item.format === 'csv' ? 'grid-outline' : item.format === 'json' ? 'document-text-outline' : 'document-outline'}
                    size={18}
                    color={item.format === 'csv' ? colors.accentPrimary : item.format === 'json' ? colors.success : colors.warning}
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
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, gap: spacing.base, paddingBottom: spacing['4xl'] },
  sectionLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
  formatGrid: { flexDirection: 'row', gap: spacing.sm },
  formatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: borderRadius.full, borderWidth: 1,
  },
  formatBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  formatHint: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  customDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.base,
  },
  dateField: {
    flex: 1, borderRadius: borderRadius.lg, padding: spacing.base, gap: 2,
  },
  dateFieldLabel: { fontSize: typography.sizes.xs },
  dateFieldValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  encryptRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  encryptInfo: { flex: 1, marginRight: spacing.base },
  encryptLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  encryptHint: { fontSize: typography.sizes.xs, marginTop: 2 },
  passphraseInput: {
    marginTop: spacing.base, borderWidth: 1, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base, paddingVertical: 12, fontSize: typography.sizes.base,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewTotal: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  previewGrid: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  previewItem: {
    width: 90, alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.lg, gap: 4,
  },
  previewIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  previewCount: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  previewLabel: { fontSize: typography.sizes.xs },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + 2,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  exportBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm,
  },
  historyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  clearText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
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
