import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { TaskRepository } from '../../database/repositories/TaskRepository';
import { EventRepository } from '../../database/repositories/EventRepository';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { GlassCard } from '../../components/common/GlassCard';
import { formatDateTime } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export function ExportScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { exports, loadAll, createExport } = usePlannerStore();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const buildTransactionsCsv = async () => {
    const rows = await new TransactionRepository(db).findAll({ limit: 10000 });
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
    return [header, ...lines].join('\n');
  };

  const buildJsonExport = async () => {
    const [transactions, tasks, events, budgets] = await Promise.all([
      new TransactionRepository(db).findAll({ limit: 10000 }),
      new TaskRepository(db).findAll({ limit: 10000 }),
      new EventRepository(db).findAll(),
      new BudgetRepository(db).findAll(),
    ]);
    return JSON.stringify({ transactions, tasks, events, budgets, exportedAt: new Date().toISOString() }, null, 2);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csv = await buildTransactionsCsv();
      await Share.share({ message: csv, title: 'Transactions export' });
      await createExport(db, { filePath: 'transactions.csv', format: 'csv', recordCount: csv.split('\n').length - 1 });
    } catch (error) {
      console.error('CSV export failed:', error);
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const json = await buildJsonExport();
      await Share.share({ message: json, title: 'Full data export' });
      await createExport(db, { filePath: 'lifeos_export.json', format: 'json', recordCount: 1 });
    } catch (error) {
      console.error('JSON export failed:', error);
      Alert.alert('Error', 'Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Export</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.info }]}
            onPress={() => navigation.navigate('CsvImport')}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.textInverse} />
            <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Import CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.accentPrimary }]}
            onPress={handleExportCsv}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Export CSV</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.success }]}
            onPress={handleExportJson}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Export JSON</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent exports</Text>

        {exports.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No exports yet.</Text>
        ) : (
          exports.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={item.format === 'csv' ? 'download-outline' : 'document-text-outline'}
                    size={20}
                    color={colors.accentPrimary}
                  />
                </View>
                <View style={styles.contentCol}>
                  <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.file_path}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {item.format.toUpperCase()} · {item.record_count ?? 0} records · {formatDateTime(item.created_at)}
                  </Text>
                </View>
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
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  buttonRow: { flexDirection: 'row', gap: spacing.base, marginBottom: spacing.xl },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  exportButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.base,
  },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  contentCol: { flex: 1 },
  fileName: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2 },
});
