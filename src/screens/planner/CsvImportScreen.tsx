import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  Card,
  Text,
  Button,
  Chip,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { RootStackParamList } from '../../navigation/types';
import { useTransactionStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { PageScaffold } from '../../components/common/PageScaffold';
import {
  parseCsvContent,
  detectColumnMapping,
  validateAndMapRows,
  type CsvColumnMapping,
  type CsvImportCandidate,
} from '../../services/csvImportService';
import { CATEGORY_COLORS } from '../../constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';

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
  const theme = useTheme();
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
    <PageScaffold
      title="Import CSV"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.content}>
        <Button
          mode="contained"
          onPress={pickFile}
          loading={isLoading}
          disabled={isLoading}
          style={styles.pickButton}
          icon={() => <Ionicons name="document-outline" size={18} color={theme.colors.onPrimary} />}
        >
          Pick CSV file
        </Button>

        {headers.length > 0 && (
          <>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
              Column mapping
            </Text>
            {ALL_FIELDS.map((field) => (
              <View key={field.key} style={styles.mappingRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                  {field.label}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    <Chip
                      selected={mapping[field.key] === ''}
                      onPress={() => updateMapping(field.key, '')}
                      style={styles.chip}
                    >
                      None
                    </Chip>
                    {headers.map((h) => (
                      <Chip
                        key={h}
                        selected={mapping[field.key] === h}
                        onPress={() => updateMapping(field.key, h)}
                        style={styles.chip}
                      >
                        {h}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}

            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.base, marginBottom: spacing.base }}>
              Preview ({validRows.length} valid, {invalidRows.length} invalid)
            </Text>

            {validRows.slice(0, 5).map((row, idx) => (
              <GlassCard key={`valid-${idx}`} style={styles.previewCard}>
                <Card.Content>
                  <View style={styles.previewRow}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
                      {row.merchant}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: row.transactionType === 'income' ? '#34D399' : theme.colors.error, fontWeight: 'bold' }}>
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {row.category} · {formatDate(row.date)}
                  </Text>
                </Card.Content>
              </GlassCard>
            ))}

            {invalidRows.slice(0, 3).map((row, idx) => (
              <Card key={`invalid-${idx}`} style={[styles.previewCard, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error, borderWidth: 1 }]} mode="elevated">
                <Card.Content>
                  <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                    {row.errors.join(', ')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {row.merchant || '(no merchant)'} · {row.amount || '(no amount)'}
                  </Text>
                </Card.Content>
              </Card>
            ))}

            <Button
              mode="contained"
              onPress={handleImport}
              disabled={validRows.length === 0 || isLoading}
              loading={isLoading}
              style={[
                styles.importButton,
                { backgroundColor: validRows.length > 0 ? '#34D399' : theme.colors.onSurfaceVariant },
              ]}
            >
              Import {validRows.length} transactions
            </Button>
          </>
        )}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  pickButton: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  mappingRow: {
    marginBottom: spacing.base,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: borderRadius.full,
  },
  previewCard: {
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  importButton: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
    paddingVertical: 4,
  },
});
