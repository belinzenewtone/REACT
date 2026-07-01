import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterType = 'all' | SearchResultType;

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'transaction', label: 'Finance', icon: 'cash-outline' },
  { key: 'task', label: 'Tasks', icon: 'checkbox-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
  { key: 'budget', label: 'Budgets', icon: 'wallet-outline' },
  { key: 'merchant', label: 'Merchants', icon: 'storefront-outline' },
];

const TYPES = ['expense', 'income', 'transfer'] as const;
const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  colors,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: colors.bgTertiary }]}>
        <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>{count}</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    transactions: true,
    tasks: true,
    events: true,
    budgets: true,
    merchants: true,
  });

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

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyResults = results
    ? results.transactions.length +
        results.tasks.length +
        results.events.length +
        results.budgets.length +
        results.merchants.length >
      0
    : false;

  const updateFilter = (key: keyof typeof filters, value: any) => setFilters({ ...filters, [key]: value });
  const clearFilter = (key: keyof typeof filters) => {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
  };

  const isIdle = !debouncedQuery.trim() && Object.keys(filters).length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Search bar */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.inputWrap, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Search transactions, tasks, events…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              hasAddedRecent.current = false;
            }}
            onSubmitEditing={handleSubmit}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); hasAddedRecent.current = false; }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFilters((v) => !v)} style={styles.iconBtn}>
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={22}
            color={Object.keys(filters).length > 0 ? colors.accentPrimary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, {
                backgroundColor: active ? colors.accentPrimary : colors.glassWhite,
                borderColor: active ? colors.accentPrimary : colors.border,
              }]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon} size={13} color={active ? colors.textInverse : colors.textSecondary} />
              <Text style={[styles.chipText, { color: active ? colors.textInverse : colors.textPrimary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Advanced filters panel */}
      {showFilters && (
        <View style={[styles.advPanel, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <View style={styles.rowInputs}>
            <FilterInput label="Min amount" value={filters.minAmount?.toString() ?? ''} onChangeText={(t) => updateFilter('minAmount', t ? parseFloat(t) : undefined)} placeholder="0" keyboardType="decimal-pad" />
            <FilterInput label="Max amount" value={filters.maxAmount?.toString() ?? ''} onChangeText={(t) => updateFilter('maxAmount', t ? parseFloat(t) : undefined)} placeholder="∞" keyboardType="decimal-pad" />
          </View>
          <View style={styles.rowInputs}>
            <FilterInput label="From date" value={filters.startDate?.split('T')[0] ?? ''} onChangeText={(t) => updateFilter('startDate', t ? new Date(`${t}T00:00:00.000Z`).toISOString() : undefined)} placeholder="YYYY-MM-DD" />
            <FilterInput label="To date" value={filters.endDate?.split('T')[0] ?? ''} onChangeText={(t) => updateFilter('endDate', t ? new Date(`${t}T23:59:59.999Z`).toISOString() : undefined)} placeholder="YYYY-MM-DD" />
          </View>
          <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Type</Text>
          <View style={styles.chipRow}>
            {(['any', ...TYPES] as const).map((t) => {
              const active = t === 'any' ? !filters.type : filters.type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.smallChip, { backgroundColor: active ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
                  onPress={() => t === 'any' ? clearFilter('type') : updateFilter('type', t)}
                >
                  <Text style={{ color: active ? colors.textInverse : colors.textPrimary, fontSize: 12, textTransform: 'capitalize' }}>
                    {t === 'any' ? 'Any' : t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={resetFilters}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Reset filters</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Idle state */}
        {isIdle && recentSearches.length === 0 && (
          <View style={styles.idleState}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>Search everything</Text>
            <Text style={[styles.idleHint, { color: colors.textSecondary }]}>
              Transactions, tasks, events, budgets and merchants.
            </Text>
          </View>
        )}

        {/* Recent searches */}
        {isIdle && recentSearches.length > 0 && (
          <View style={styles.recentBox}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: colors.textPrimary }]}>Recent searches</Text>
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
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accentPrimary} />
            <Text style={[styles.idleHint, { color: colors.textSecondary }]}>Searching…</Text>
          </View>
        )}

        {/* No results */}
        {!isLoading && !isIdle && !hasAnyResults && (
          <View style={styles.idleState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>No results</Text>
            <Text style={[styles.idleHint, { color: colors.textSecondary }]}>
              Try different keywords or adjust filters.
            </Text>
          </View>
        )}

        {/* Results */}
        {results && !isLoading && (
          <>
            {/* Transactions */}
            {(filter === 'all' || filter === 'transaction') && results.transactions.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Transactions"
                  count={results.transactions.length}
                  expanded={expanded.transactions}
                  onToggle={() => toggleSection('transactions')}
                  colors={colors}
                />
                {expanded.transactions && results.transactions.map((tx) => (
                  <TouchableOpacity key={tx.id} onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${colors.accentPrimary}20` }]}>
                          <Ionicons name="cash-outline" size={16} color={colors.accentPrimary} />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={tx.merchant} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            <Highlight text={tx.category} query={debouncedQuery} style={{ color: colors.textSecondary }} /> · {formatDate(tx.date)}
                          </Text>
                        </View>
                        <Text style={[styles.amount, { color: tx.transaction_type === 'income' ? colors.success : colors.danger }]}>
                          {formatCurrency(tx.amount)}
                        </Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tasks */}
            {(filter === 'all' || filter === 'task') && results.tasks.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Tasks"
                  count={results.tasks.length}
                  expanded={expanded.tasks}
                  onToggle={() => toggleSection('tasks')}
                  colors={colors}
                />
                {expanded.tasks && results.tasks.map((task) => (
                  <TouchableOpacity key={task.id} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${colors.success}20` }]}>
                          <Ionicons name={task.status === 'completed' ? 'checkbox' : 'square-outline'} size={16} color={colors.success} />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={task.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} />
                          {task.deadline && (
                            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{formatDateTime(task.deadline)}</Text>
                          )}
                        </View>
                        <View style={[styles.priorityDot, { backgroundColor: colors.priority?.[task.priority] ?? colors.textTertiary }]} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Events */}
            {(filter === 'all' || filter === 'event') && results.events.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Events"
                  count={results.events.length}
                  expanded={expanded.events}
                  onToggle={() => toggleSection('events')}
                  colors={colors}
                />
                {expanded.events && results.events.map((event) => (
                  <TouchableOpacity key={event.id} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${colors.warning}20` }]}>
                          <Ionicons name="calendar-outline" size={16} color={colors.warning} />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={event.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatDateTime(event.date)}{event.location ? ` · ${event.location}` : ''}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Budgets */}
            {(filter === 'all' || filter === 'budget') && results.budgets.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Budgets"
                  count={results.budgets.length}
                  expanded={expanded.budgets}
                  onToggle={() => toggleSection('budgets')}
                  colors={colors}
                />
                {expanded.budgets && results.budgets.map((budget) => (
                  <TouchableOpacity key={budget.id} onPress={() => navigation.navigate('BudgetForm', { budgetId: budget.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#A78BFA20' }]}>
                          <Ionicons name="wallet-outline" size={16} color="#A78BFA" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={budget.category} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            Limit {formatCurrency(budget.limit_amount)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Merchants */}
            {(filter === 'all' || filter === 'merchant') && results.merchants.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Merchants"
                  count={results.merchants.length}
                  expanded={expanded.merchants}
                  onToggle={() => toggleSection('merchants')}
                  colors={colors}
                />
                {expanded.merchants && results.merchants.map((merchant) => (
                  <GlassCard key={merchant.id} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: `${colors.accentSecondary ?? colors.info}20` }]}>
                        <Ionicons name="storefront-outline" size={16} color={colors.accentSecondary ?? colors.info} />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={merchant.name} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} />
                        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                          {merchant.transactionCount} transactions
                        </Text>
                      </View>
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>
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

function Highlight({ text, query, style, numberOfLines }: { text: string; query: string; style?: any; numberOfLines?: number }) {
  const colors = useThemeColors();
  if (!query.trim()) return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={{ backgroundColor: `${colors.accentPrimary}40`, color: colors.textPrimary }}>{part}</Text>
        ) : part
      )}
    </Text>
  );
}

function FilterInput({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: 'default' | 'decimal-pad' | 'numeric';
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.filterInput, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <Text style={[styles.filterInputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={{ color: colors.textPrimary, fontSize: typography.sizes.base }}
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
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base, gap: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, borderWidth: 1,
    paddingHorizontal: spacing.base, height: 48, gap: spacing.sm,
  },
  input: { flex: 1, fontSize: typography.sizes.base, height: '100%' },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.base, gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, gap: 4,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  advPanel: {
    marginHorizontal: spacing.lg, marginBottom: spacing.base,
    borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.base,
  },
  rowInputs: { flexDirection: 'row', gap: spacing.base, marginBottom: spacing.base },
  filterInput: {
    flex: 1, borderRadius: borderRadius.md, borderWidth: 1,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
  },
  filterInputLabel: { fontSize: typography.sizes.xs, marginBottom: 2 },
  filterGroupLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  smallChip: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  resetBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center' },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing['4xl'] },
  idleState: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.sm },
  loadingState: { alignItems: 'center', paddingTop: spacing['2xl'], gap: spacing.sm },
  idleTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold },
  idleHint: { fontSize: typography.sizes.base, textAlign: 'center', lineHeight: 22 },
  recentBox: { marginBottom: spacing.lg },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recentTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  clearText: { fontSize: typography.sizes.sm },
  recentChips: { flexDirection: 'row', gap: spacing.sm },
  recentChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, gap: 4, maxWidth: 160,
  },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, flex: 1 },
  countBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  countBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  card: { marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  cardSub: { fontSize: typography.sizes.sm, marginTop: 2 },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, marginLeft: spacing.sm },
  priorityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
});
