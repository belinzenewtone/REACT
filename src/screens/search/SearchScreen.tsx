import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearchStore } from '../../store';
import { searchAll, type SearchResults, type SearchResultType } from '../../services/searchService';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { CATEGORY_COLORS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';

type FilterType = 'all' | SearchResultType;

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'transaction', label: 'Transactions', icon: 'cash-outline' },
  { key: 'task', label: 'Tasks', icon: 'checkbox-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
  { key: 'budget', label: 'Budgets', icon: 'wallet-outline' },
  { key: 'merchant', label: 'Merchants', icon: 'storefront-outline' },
];

const TYPES = ['expense', 'income', 'transfer'] as const;
const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');

export function SearchScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { recentSearches, filters, addRecentSearch, clearRecentSearches, setFilters, resetFilters } =
    useSearchStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const hasAddedRecent = useRef(false);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && Object.keys(filters).length === 0) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await searchAll(db, debouncedQuery, filters, 30);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, debouncedQuery, filters]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleSubmit = () => {
    if (query.trim() && !hasAddedRecent.current) {
      addRecentSearch(query);
      hasAddedRecent.current = true;
    }
  };

  const hasAnyResults = results
    ? results.transactions.length +
        results.tasks.length +
        results.events.length +
        results.budgets.length +
        results.merchants.length >
      0
    : false;

  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof typeof filters) => {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.inputContainer, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Search transactions, tasks, events..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              hasAddedRecent.current = false;
            }}
            onSubmitEditing={handleSubmit}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); hasAddedRecent.current = false; }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFilters((v) => !v)} style={styles.filterButton}>
          <Ionicons name={showFilters ? 'options' : 'options-outline'} size={22} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.accentPrimary : colors.glassWhite,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={selected ? colors.textInverse : colors.textPrimary}
              />
              <Text style={[styles.filterText, { color: selected ? colors.textInverse : colors.textPrimary }]} numberOfLines={1}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {recentSearches.length > 0 && !debouncedQuery.trim() && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.textPrimary }]}>Recent</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.recentChips}>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[styles.recentChip, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
                  onPress={() => setQuery(term)}
                >
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.recentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {showFilters && (
        <View style={[styles.advancedFilters, { borderColor: colors.border }]}>
          <View style={styles.rowInputs}>
            <FilterInput
              label="Min amount"
              value={filters.minAmount?.toString() ?? ''}
              onChangeText={(text) => updateFilter('minAmount', text ? parseFloat(text) : undefined)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <FilterInput
              label="Max amount"
              value={filters.maxAmount?.toString() ?? ''}
              onChangeText={(text) => updateFilter('maxAmount', text ? parseFloat(text) : undefined)}
              placeholder="∞"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowInputs}>
            <FilterInput
              label="From date"
              value={filters.startDate?.split('T')[0] ?? ''}
              onChangeText={(text) => updateFilter('startDate', text ? new Date(`${text}T00:00:00.000Z`).toISOString() : undefined)}
              placeholder="YYYY-MM-DD"
            />
            <FilterInput
              label="To date"
              value={filters.endDate?.split('T')[0] ?? ''}
              onChangeText={(text) => updateFilter('endDate', text ? new Date(`${text}T23:59:59.999Z`).toISOString() : undefined)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Type</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.smallChip, { backgroundColor: !filters.type ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
              onPress={() => clearFilter('type')}
            >
              <Text style={{ color: !filters.type ? colors.textInverse : colors.textPrimary, fontSize: 12 }}>Any</Text>
            </TouchableOpacity>
            {TYPES.map((t) => {
              const selected = filters.type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.smallChip, { backgroundColor: selected ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
                  onPress={() => updateFilter('type', t)}
                >
                  <Text style={{ color: selected ? colors.textInverse : colors.textPrimary, fontSize: 12, textTransform: 'capitalize' }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.smallChip, { backgroundColor: !filters.category ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
              onPress={() => clearFilter('category')}
            >
              <Text style={{ color: !filters.category ? colors.textInverse : colors.textPrimary, fontSize: 12 }}>Any</Text>
            </TouchableOpacity>
            {CATEGORIES.map((c) => {
              const selected = filters.category === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.smallChip, { backgroundColor: selected ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
                  onPress={() => updateFilter('category', c)}
                >
                  <Text style={{ color: selected ? colors.textInverse : colors.textPrimary, fontSize: 12, textTransform: 'capitalize' }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetFilters}>
            <Text style={{ color: colors.textSecondary }}>Reset filters</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && <ActivityIndicator style={styles.loader} color={colors.accentPrimary} />}

        {!isLoading && !debouncedQuery.trim() && Object.keys(filters).length === 0 && (
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Type to search across transactions, tasks, events, budgets and merchants.
          </Text>
        )}

        {!isLoading && (debouncedQuery.trim() || Object.keys(filters).length > 0) && !hasAnyResults && (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            No results
          </Text>
        )}

        {results && (
          <>
            {(filter === 'all' || filter === 'transaction') && results.transactions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transactions</Text>
                {results.transactions.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
                  >
                    <GlassCard style={styles.resultCard}>
                      <View style={styles.resultRow}>
                        <View style={styles.resultContent}>
                          <Highlight text={tx.merchant} query={debouncedQuery} style={[styles.resultTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                            <Highlight text={tx.category} query={debouncedQuery} style={{ color: colors.textSecondary }} /> · {formatDate(tx.date)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.resultAmount,
                            { color: tx.transaction_type === 'income' ? colors.success : colors.danger },
                          ]}
                        >
                          {formatCurrency(tx.amount)}
                        </Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'task') && results.tasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tasks</Text>
                {results.tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  >
                    <GlassCard style={styles.resultCard}>
                      <View style={styles.resultRow}>
                        <Ionicons
                          name={task.status === 'completed' ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={task.status === 'completed' ? colors.success : colors.textTertiary}
                        />
                        <View style={[styles.resultContent, styles.taskContent]}>
                          <Highlight text={task.title} query={debouncedQuery} style={[styles.resultTitle, { color: colors.textPrimary }]} />
                          {task.deadline && (
                            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                              {formatDateTime(task.deadline)}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.priorityDot, { backgroundColor: colors.priority[task.priority] }]} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'event') && results.events.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Events</Text>
                {results.events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  >
                    <GlassCard style={styles.resultCard}>
                      <View style={styles.resultRow}>
                        <Ionicons name="calendar" size={18} color={colors.accentPrimary} />
                        <View style={[styles.resultContent, styles.taskContent]}>
                          <Highlight text={event.title} query={debouncedQuery} style={[styles.resultTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                            {formatDateTime(event.date)}
                            {event.location ? ` · ${event.location}` : ''}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'budget') && results.budgets.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budgets</Text>
                {results.budgets.map((budget) => (
                  <TouchableOpacity
                    key={budget.id}
                    onPress={() => navigation.navigate('BudgetForm', { budgetId: budget.id })}
                  >
                    <GlassCard style={styles.resultCard}>
                      <View style={styles.resultRow}>
                        <View style={styles.resultContent}>
                          <Highlight text={budget.category} query={debouncedQuery} style={[styles.resultTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                            Limit {formatCurrency(budget.limit_amount)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'merchant') && results.merchants.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Merchants</Text>
                {results.merchants.map((merchant) => (
                  <GlassCard key={merchant.id} style={styles.resultCard}>
                    <View style={styles.resultRow}>
                      <View style={styles.resultContent}>
                        <Highlight text={merchant.name} query={debouncedQuery} style={[styles.resultTitle, { color: colors.textPrimary }]} />
                        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                          {merchant.transactionCount} transactions
                        </Text>
                      </View>
                      <Text style={[styles.resultAmount, { color: colors.textPrimary }]}>
                        {formatCurrency(merchant.totalSpent)}
                      </Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Highlight({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query: string;
  style?: any;
  numberOfLines?: number;
}) {
  const colors = useThemeColors();
  if (!query.trim()) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={{ backgroundColor: `${colors.accentPrimary}40`, color: colors.textPrimary }}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.filterInputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <Text style={[styles.filterInputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.filterInput, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    gap: spacing.sm,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    height: 48,
    gap: spacing.sm,
  },
  input: { flex: 1, fontSize: typography.sizes.base, height: '100%' },
  filterButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  filterText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  recentSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.base },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recentTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  clearText: { fontSize: typography.sizes.sm },
  recentChips: { flexDirection: 'row', gap: spacing.sm },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
    maxWidth: 160,
  },
  recentChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  advancedFilters: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.base,
  },
  rowInputs: { flexDirection: 'row', gap: spacing.base, marginBottom: spacing.base },
  filterInputGroup: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  filterInputLabel: { fontSize: typography.sizes.xs, marginBottom: 2 },
  filterInput: { fontSize: typography.sizes.base, paddingVertical: 2 },
  filterLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  smallChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  resetButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  hint: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginBottom: spacing.base },
  resultCard: { marginBottom: spacing.sm, padding: spacing.base },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultContent: { flex: 1 },
  taskContent: { marginLeft: spacing.sm },
  resultTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  resultSubtitle: { fontSize: typography.sizes.sm, marginTop: 2 },
  resultAmount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, marginLeft: spacing.sm },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
});
