import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import CryptoJS from 'crypto-js';
import {
  Card,
  Text,
  Button,
  Chip,
  Switch,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { usePlannerStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { EventRepository } from '../../database/repositories/EventRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { IncomeRepository } from '../../database/repositories/IncomeRepository';
import { RecurringRuleRepository } from '../../database/repositories/RecurringRuleRepository';
import { PageScaffold } from '../../components/common/PageScaffold';
import { formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

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
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.key === value)?.label ?? value;

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => setOpen(true)}
        style={styles.dropdownTrigger}
        contentStyle={styles.dropdownTriggerContent}
        textColor={theme.colors.onSurface}
        icon={() => <Ionicons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />}
      >
        {selectedLabel}
      </Button>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.dropdownOverlay}>
          <Card style={[styles.dropdownSheet, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>
                {label}
              </Text>
              {options.map((o, i) => {
                const active = o.key === value;
                return (
                  <Button
                    key={o.key}
                    mode="text"
                    onPress={() => {
                      onChange(o.key);
                      setOpen(false);
                    }}
                    style={[
                      styles.dropdownOption,
                      active && { backgroundColor: `${theme.colors.primary}15` },
                      i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant },
                    ]}
                    textColor={active ? theme.colors.primary : theme.colors.onSurface}
                  >
                    {o.label}
                  </Button>
                );
              })}
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

type DomainCounts = Record<string, number>;

export function ExportScreen() {
  const theme = useTheme();
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
  // Data-type toggles — user picks which domains land in the JSON/PDF export.
  // Default to all selected so behavior matches the pre-toggle version.
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    () => new Set(PREVIEW_DOMAINS.map((d) => d.key))
  );
  const toggleDomain = (key: string) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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
    const { start, end } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    const rows = await new TransactionRepository(db).findAll({
      limit: 50000,
      startDate: start,
      endDate: end,
    });
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
    const { start, end } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    // Only fetch domains the user asked for; leave others as empty arrays so
    // the export shape stays stable for downstream tooling.
    const want = (k: string) => selectedDomains.has(k);
    const [transactions, tasks, events, budgets, incomes, recurring, goals] = await Promise.all([
      want('transactions') ? new TransactionRepository(db).findAll({ limit: 50000, startDate: start, endDate: end }) : Promise.resolve([]),
      want('tasks') ? new TaskRepository(db).findAll({ limit: 50000 }) : Promise.resolve([]),
      want('events') ? new EventRepository(db).findAll() : Promise.resolve([]),
      want('budgets') ? new BudgetRepository(db).findAll() : Promise.resolve([]),
      want('incomes') ? new IncomeRepository(db).findAll() : Promise.resolve([]),
      want('recurring') ? new RecurringRuleRepository(db).findAll() : Promise.resolve([]),
      want('goals') ? new (require('../../database/repositories/GoalRepository').GoalRepository)(db).findAll() : Promise.resolve([]),
    ]);
    return {
      content: JSON.stringify(
        {
          transactions,
          tasks,
          events,
          budgets,
          incomes,
          recurring,
          goals,
          exportedAt: new Date().toISOString(),
          window: { start, end },
          selectedDomains: Array.from(selectedDomains),
        },
        null,
        2,
      ),
      count:
        transactions.length + tasks.length + events.length + budgets.length +
        incomes.length + recurring.length + (goals as any[]).length,
    };
  };

  const buildPdfText = async () => {
    const { start, end } = getDateRange(dateWindow, customFrom ?? undefined, customTo ?? undefined);
    const want = (k: string) => selectedDomains.has(k);
    const [transactions, tasks, events, budgets] = await Promise.all([
      want('transactions') ? new TransactionRepository(db).findAll({ limit: 50000, startDate: start, endDate: end }) : Promise.resolve([]),
      want('tasks') ? new TaskRepository(db).findAll({ limit: 50000 }) : Promise.resolve([]),
      want('events') ? new EventRepository(db).findAll() : Promise.resolve([]),
      want('budgets') ? new BudgetRepository(db).findAll() : Promise.resolve([]),
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
    if (encryptEnabled) {
      const trimmed = passphrase.trim();
      if (!trimmed) {
        Alert.alert('Passphrase required', 'Enter a passphrase to encrypt this export, or turn off encryption.');
        return;
      }
      if (trimmed.length < 6) {
        Alert.alert('Passphrase too short', 'Use a passphrase of at least 6 characters for meaningful encryption.');
        return;
      }
    }
    // At least one domain must be selected for multi-domain formats.
    if ((format_ === 'json' || format_ === 'pdf') && selectedDomains.size === 0) {
      Alert.alert('Nothing to export', 'Pick at least one data type to include in the export.');
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
    <PageScaffold
      title="Export"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.content}>
        {/* ── Format ── */}
        <Card style={{ backgroundColor: theme.colors.surfaceVariant }} mode="elevated">
          <Card.Content>
            <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              FORMAT
            </Text>
            <View style={styles.formatGrid}>
              {FORMAT_OPTIONS.map((opt) => {
                const active = format_ === opt.key;
                return (
                  <Chip
                    key={opt.key}
                    selected={active}
                    onPress={() => setFormat(opt.key)}
                    style={[
                      styles.formatChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                        borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                      },
                    ]}
                    textStyle={{ color: active ? theme.colors.onPrimary : theme.colors.onSurface }}
                    icon={() => (
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                      />
                    )}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
              {format_ === 'csv'
                ? 'Transactions only — opens in Excel / Google Sheets'
                : format_ === 'json'
                  ? 'All data: transactions, tasks, events, budgets'
                  : 'Formatted document — share or save as PDF'}
            </Text>
          </Card.Content>
        </Card>

        {/* ── Date Window (dropdown) ── */}
        <Card style={{ backgroundColor: theme.colors.surfaceVariant, marginTop: spacing.base }} mode="elevated">
          <Card.Content>
            <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              DATE WINDOW
            </Text>
            <ExportDropdown
              label="DATE WINDOW"
              options={DATE_WINDOWS}
              value={dateWindow}
              onChange={(v) => { setDateWindow(v); if (v !== 'custom') { setCustomFrom(null); setCustomTo(null); } }}
            />
            {dateWindow === 'custom' && (
              <View style={styles.customDateRow}>
                <TouchableRipple
                  onPress={() => setShowDatePicker('from')}
                  style={[styles.dateField, { borderColor: theme.colors.outlineVariant }]}
                >
                  <View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>From</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 2 }}>
                      {customFrom ? format(customFrom, 'MMM d, yyyy') : 'Select'}
                    </Text>
                  </View>
                </TouchableRipple>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.onSurfaceVariant} />
                <TouchableRipple
                  onPress={() => setShowDatePicker('to')}
                  style={[styles.dateField, { borderColor: theme.colors.outlineVariant }]}
                >
                  <View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>To</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 2 }}>
                      {customTo ? format(customTo, 'MMM d, yyyy') : 'Select'}
                    </Text>
                  </View>
                </TouchableRipple>
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
          </Card.Content>
        </Card>

        {/* ── Encrypt file ── */}
        <Card style={{ backgroundColor: theme.colors.surfaceVariant, marginTop: spacing.base }} mode="elevated">
          <Card.Content>
            <View style={styles.encryptRow}>
              <View style={styles.encryptInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Encrypt file</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Protect the export with a passphrase
                </Text>
              </View>
              <Switch
                value={encryptEnabled}
                onValueChange={setEncryptEnabled}
                color={theme.colors.primary}
              />
            </View>
            {encryptEnabled && (
              <TextInput
                mode="outlined"
                dense
                label="Passphrase"
                placeholder="Enter passphrase"
                value={passphrase}
                onChangeText={setPassphrase}
                secureTextEntry
                style={{ marginTop: spacing.sm, backgroundColor: 'transparent' }}
              />
            )}
          </Card.Content>
        </Card>

        {/* ── Export Preview ── */}
        <Card style={{ backgroundColor: theme.colors.surfaceVariant, marginTop: spacing.base }} mode="elevated">
          <Card.Content>
            <View style={styles.previewHeader}>
              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginBottom: 0 }]}>
                EXPORT PREVIEW
              </Text>
              <View style={styles.previewHeaderRight}>
                {isLoadingCounts && <ActivityIndicator size="small" color={theme.colors.primary} />}
                {counts && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Total items: {total}
                  </Text>
                )}
              </View>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.xs }}>
              {format_ === 'csv'
                ? 'CSV exports transactions only.'
                : 'Tap a card to include or exclude that data type.'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewGrid}>
              {PREVIEW_DOMAINS.map((d) => {
                const csvLocked = format_ === 'csv' && d.key !== 'transactions';
                const active = format_ === 'csv'
                  ? d.key === 'transactions'
                  : selectedDomains.has(d.key);
                return (
                  <TouchableRipple
                    key={d.key}
                    disabled={csvLocked}
                    onPress={() => toggleDomain(d.key)}
                    style={[
                      styles.previewItem,
                      {
                        backgroundColor: active ? `${d.color}30` : `${d.color}15`,
                        borderColor: active ? d.color : `${d.color}50`,
                        opacity: csvLocked ? 0.35 : 1,
                      },
                    ]}
                  >
                    <View style={styles.previewItemContent}>
                      <View style={[styles.previewIcon, { backgroundColor: `${d.color}25` }]}>
                        <Ionicons name={d.icon} size={16} color={d.color} />
                      </View>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                        {counts?.[d.key] ?? '—'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {d.label}
                      </Text>
                    </View>
                  </TouchableRipple>
                );
              })}
            </ScrollView>
          </Card.Content>
        </Card>

        {/* ── Export Button ── */}
        <Button
          mode="contained"
          onPress={handleExport}
          loading={isExporting}
          disabled={isExporting}
          style={styles.exportBtn}
          icon={() => <Ionicons name="share-outline" size={18} color={theme.colors.onPrimary} />}
        >
          Export {format_.toUpperCase()}
        </Button>

        {/* ── Export History ── */}
        <View style={styles.historyHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Export History</Text>
          {exports.length > 0 && (
            <Button
              mode="text"
              compact
              textColor={theme.colors.error}
              onPress={() => Alert.alert('Clear history', 'Clear all export history?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  await db.runAsync('DELETE FROM exports');
                  loadAll(db);
                }},
              ])}
            >
              Clear
            </Button>
          )}
        </View>

        {exports.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="archive-outline" size={36} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No exports yet</Text>
          </View>
        ) : (
          exports.map((item) => (
            <Card key={item.id} style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.sm }} mode="elevated">
              <Card.Content>
                <View style={styles.historyRow}>
                  <View style={[styles.historyIcon, {
                    backgroundColor: item.format === 'csv' ? `${theme.colors.primary}20`
                      : item.format === 'json' ? '#34D39920'
                      : '#F59E0B20',
                  }]}>
                    <Ionicons
                      name={item.format === 'csv' ? 'grid-outline' : item.format === 'json' ? 'document-text-outline' : 'document-outline'}
                      size={18}
                      color={item.format === 'csv' ? theme.colors.primary : item.format === 'json' ? '#34D399' : '#F59E0B'}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                      {item.file_path}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.format.toUpperCase()} · {item.record_count ?? 0} records · {formatDateTime(item.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: '#34D399' }]} />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formatChip: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  dropdownTrigger: {
    borderRadius: borderRadius.lg,
  },
  dropdownTriggerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingBottom: spacing['4xl'],
  },
  dropdownOption: {
    borderRadius: borderRadius.md,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  dateField: {
    flex: 1,
    borderRadius: borderRadius.lg,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  encryptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  encryptInfo: {
    flex: 1,
    marginRight: spacing.base,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewGrid: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  previewItem: {
    width: 92,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewItemContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
