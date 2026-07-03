import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { RootStackParamList } from '../../navigation/types';
import { useTransactionStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { GlassCard } from '../../components/common/GlassCard';
import {
  parseCsvContent,
  detectColumnMapping,
  validateAndMapRows,
  type CsvColumnMapping,
  type CsvImportCandidate,
} from '../../services/csvImportService';
import { CATEGORY_COLORS } from '../../constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

const ALL_FIELDS: { key: keyof CsvColumnMapping; label: string }[] = [
  { key: 'amount', label: 'Amount *' },
  { key: 'merchant', label: 'Merchant *' },
  { key: 'date', label: 'Date *' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
];

type CsvImportRouteProp = RouteProp<RootStackParamList, 'CsvImport'>;

export function CsvImportScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<CsvImportRouteProp>();
  const { loadTransactions } = useTransactionStore();

  const [isLoading, setIsLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [rows, setRows] = useState<CsvImportCandidate[]>([]);
  const [mapping, setMapping] = useState<CsvColumnMapping>({
    amount: '',
    merchant: '',
    date: '',
    category: '',
    type: '',
    status: '',
    description: '',
  });

  const processFile = async (uri: string) => {
    try {
      setIsLoading(true);
      const content = await FileSystem.readAsStringAsync(uri);
      const { headers: parsedHeaders, rows: parsedRows } = parseCsvContent(content);
      setHeaders(parsedHeaders);
      setRawRows(parsedRows);

      const detected = detectColumnMapping(parsedHeaders);
      const initialMapping: CsvColumnMapping = {
        amount: detected.amount ?? '',
        merchant: detected.merchant ?? '',
        date: detected.date ?? '',
        category: detected.category ?? '',
        type: detected.type ?? '',
        status: detected.status ?? '',
        description: detected.description ?? '',
      };
      setMapping(initialMapping);
      const { candidates } = validateAndMapRows(parsedRows, initialMapping);
      setRows(candidates);
    } catch (error) {
      console.error('Failed to read CSV:', error);
      Alert.alert('Error', 'Failed to read CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (route.params?.fileUri) {
      processFile(route.params.fileUri);
    }
  }, [route.params?.fileUri]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
    if (result.canceled || !result.assets?.length) return;
    await processFile(result.assets[0].uri);
  };

  const updateMapping = (field: keyof CsvColumnMapping, header: string) => {
    const next = { ...mapping, [field]: header };
    setMapping(next);
    const { candidates } = validateAndMapRows(rawRows, next);
    setRows(candidates);
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      Alert.alert('No valid rows', 'Check your column mapping and data.');
      return;
    }

    setIsLoading(true);
    try {
      const repo = new TransactionRepository(db);
      const expenseCategories = new Set<string>();
      for (const row of validRows) {
        await repo.create({
          amount: row.amount,
          merchant: row.merchant,
          category: CATEGORY_COLORS[row.category] ? row.category : 'uncategorized',
          date: row.date,
          source: 'csv',
          transactionType: row.transactionType,
          status: row.status,
          description: row.description,
          recordSource: 'csv',
        });
        if (row.transactionType === 'expense') {
          expenseCategories.add(CATEGORY_COLORS[row.category] ? row.category : 'uncategorized');
        }
      }
      await loadTransactions(repo, true);
      for (const category of expenseCategories) {
        await checkBudgetThresholds(db, category);
      }
      Alert.alert('Import complete', `${validRows.length} transactions imported.`);
      navigation.goBack();
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert('Error', 'Failed to import transactions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Import CSV</Text>
          <View style={{ width: 24 }} />
        </View>

        <TouchableOpacity
          style={[styles.pickButton, { backgroundColor: colors.accentPrimary }]}
          onPress={pickFile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="document-outline" size={18} color={colors.textInverse} />
              <Text style={[styles.pickButtonText, { color: colors.textInverse }]}>Pick CSV file</Text>
            </>
          )}
        </TouchableOpacity>

        {headers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Column mapping</Text>
            {ALL_FIELDS.map((field) => (
              <View key={field.key} style={styles.mappingRow}>
                <Text style={[styles.mappingLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        { backgroundColor: mapping[field.key] === '' ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border },
                      ]}
                      onPress={() => updateMapping(field.key, '')}
                    >
                      <Text style={{ color: mapping[field.key] === '' ? colors.textInverse : colors.textPrimary, fontSize: 12 }}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {headers.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.chip,
                          { backgroundColor: mapping[field.key] === h ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border },
                        ]}
                        onPress={() => updateMapping(field.key, h)}
                      >
                        <Text style={{ color: mapping[field.key] === h ? colors.textInverse : colors.textPrimary, fontSize: 12 }}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Preview ({validRows.length} valid, {invalidRows.length} invalid)
            </Text>

            {validRows.slice(0, 5).map((row, idx) => (
              <GlassCard key={`valid-${idx}`} style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {row.merchant}
                  </Text>
                  <Text style={[styles.previewAmount, { color: row.transactionType === 'income' ? colors.success : colors.danger }]}>
                    {formatCurrency(row.amount)}
                  </Text>
                </View>
                <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                  {row.category} · {formatDate(row.date)}
                </Text>
              </GlassCard>
            ))}

            {invalidRows.slice(0, 3).map((row, idx) => (
              <GlassCard key={`invalid-${idx}`} style={styles.invalidCard}>
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {row.errors.join(', ')}
                </Text>
                <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                  {row.merchant || '(no merchant)'} · {row.amount || '(no amount)'}
                </Text>
              </GlassCard>
            ))}

            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: validRows.length > 0 ? colors.success : colors.textTertiary }]}
              onPress={handleImport}
              disabled={validRows.length === 0 || isLoading}
            >
              <Text style={[styles.importButtonText, { color: colors.textInverse }]}>
                Import {validRows.length} transactions
              </Text>
            </TouchableOpacity>
          </>
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
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  pickButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.base,
    marginTop: spacing.base,
  },
  mappingRow: { marginBottom: spacing.base },
  mappingLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  previewCard: { marginBottom: spacing.sm, padding: spacing.base },
  invalidCard: { marginBottom: spacing.sm, padding: spacing.base, borderWidth: 1, borderColor: '#FF6B6B' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium, flex: 1 },
  previewAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  previewMeta: { fontSize: typography.sizes.sm, marginTop: 2 },
  errorText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  importButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  importButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
