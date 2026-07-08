import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { Text, Searchbar, Chip, Button, IconButton, useTheme } from 'react-native-paper';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearchStore } from '../../store';
import { searchAll, type SearchResults, type SearchResultType } from '../../services/searchService';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';

type FilterType = 'all' | SearchResultType;

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'transaction', label: 'Finance', icon: 'cash-outline' },
  { key: 'task', label: 'Tasks', icon: 'checkbox-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
  { key: 'birthday', label: 'Birthdays', icon: 'gift-outline' },
  { key: 'anniversary', label: 'Anniversary', icon: 'heart-outline' },
  { key: 'countdown', label: 'Countdown', icon: 'timer-outline' },
  { key: 'budget', label: 'Budgets', icon: 'wallet-outline' },
  { key: 'recurring', label: 'Recurring', icon: 'repeat-outline' },
];

const TYPE_COLORS: Record<string, string> = {
  birthday: '#FF69B4',
  anniversary: '#FF6B6B',
  countdown: '#FFA726',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#7FC8F8',
  medium: '#F5CB5C',
  high: '#F2B8B5',
};

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>{title}</Text>
      <Chip
        style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: spacing.sm }}
        textStyle={{ color: theme.colors.onSurfaceVariant }}
      >
        {count}
      </Chip>
      <IconButton
        icon={() => <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.outline} />}
        size={16}
        onPress={onToggle}
        style={{ margin: 0 }}
      />
    </View>
  );
}

export function SearchScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useSearchStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    transactions: true,
    tasks: true,
    events: true,
    birthdays: true,
    anniversaries: true,
    countdowns: true,
    budgets: true,
    recurring: true,
    bills: true,
    goals: true,
    incomes: true,
    loans: true,
  });

  const debouncedQuery = useDebounce(query, 300);
  const hasAddedRecent = useRef(false);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await searchAll(db, debouncedQuery);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, debouncedQuery]);

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
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyResults = results
    ? results.transactions.length +
        results.tasks.length +
        results.events.length +
        results.birthdays.length +
        results.anniversaries.length +
        results.countdowns.length +
        results.budgets.length +
        results.recurring.length +
        results.bills.length +
        results.goals.length +
        results.incomes.length +
        results.loans.length >
      0
    : false;

  const isIdle = !debouncedQuery.trim();

  const historyQuery = useDebounce(query, 1500);
  useEffect(() => {
    if (
      historyQuery.trim().length >= 2 &&
      historyQuery === query &&
      hasAnyResults &&
      !hasAddedRecent.current
    ) {
      addRecentSearch(historyQuery);
      hasAddedRecent.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyQuery, hasAnyResults]);

  function renderResultCard({
    icon,
    iconBg,
    title,
    subtitle,
    right,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    title: string;
    subtitle: string;
    right?: React.ReactNode;
    onPress: () => void;
  }) {
    return (
      <GlassCard style={styles.card} onPress={onPress}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={16} color="#FFF" />
          </View>
          <View style={styles.cardContent}>
            <Highlight text={title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          {right}
        </View>
      </GlassCard>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Search bar */}
      <View style={styles.headerRow}>
        <IconButton
          icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
          size={24}
          onPress={() => navigation.goBack()}
          style={{ margin: 0 }}
        />
        <Searchbar
          placeholder="Search transactions, tasks, events…"
          onChangeText={(text) => {
            setQuery(text);
            hasAddedRecent.current = false;
          }}
          value={query}
          onSubmitEditing={handleSubmit}
          autoFocus
          returnKeyType="search"
          style={{ flex: 1, backgroundColor: theme.colors.surfaceVariant }}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.outline}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.chipsBar}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Chip
              key={f.key}
              selected={active}
              onPress={() => setFilter(f.key)}
              style={{
                backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                marginRight: spacing.sm,
              }}
              textStyle={{ color: active ? theme.colors.onPrimary : theme.colors.onSurface }}
              icon={() => <Ionicons name={f.icon} size={13} color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />}
            >
              {f.label}
            </Chip>
          );
        })}
        <View style={styles.chipsTrailing} />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {isIdle && recentSearches.length === 0 && (
          <View style={styles.idleState}>
            <Ionicons name="search-outline" size={48} color={theme.colors.outline} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Search everything</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Transactions, tasks, events, birthdays and more.
            </Text>
          </View>
        )}

        {isIdle && recentSearches.length > 0 && (
          <View style={styles.recentBox}>
            <View style={styles.recentHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Recent searches</Text>
              <Button mode="text" onPress={clearRecentSearches} textColor={theme.colors.error} compact>
                Clear
              </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.recentChips}>
                {recentSearches.map((term) => (
                  <Chip
                    key={term}
                    style={{ backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, marginRight: spacing.sm }}
                    textStyle={{ color: theme.colors.onSurface }}
                    icon={() => <Ionicons name="time-outline" size={13} color={theme.colors.onSurfaceVariant} />}
                    onPress={() => setQuery(term)}
                  >
                    {term}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Searching…</Text>
          </View>
        )}

        {!isLoading && !isIdle && !hasAnyResults && (
          <View style={styles.idleState}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.outline} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>No results</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Try different keywords or adjust filters.
            </Text>
          </View>
        )}

        {results && !isLoading && (
          <>
            {(filter === 'all' || filter === 'transaction') && results.transactions.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Transactions"
                  count={results.transactions.length}
                  expanded={expanded.transactions}
                  onToggle={() => toggleSection('transactions')}
                />
                {expanded.transactions && results.transactions.map((tx) => (
                  <GlassCard key={tx.id} style={styles.card} onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}20` }]}>
                        <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={tx.merchant} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          <Highlight text={tx.category} query={debouncedQuery} style={{ color: theme.colors.onSurfaceVariant }} /> · {formatDate(tx.date)}
                        </Text>
                      </View>
                      <Text variant="bodyMedium" style={{ color: tx.transaction_type === 'income' ? '#22C55E' : theme.colors.error, fontWeight: '700', marginLeft: spacing.sm }}>
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'task') && results.tasks.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Tasks"
                  count={results.tasks.length}
                  expanded={expanded.tasks}
                  onToggle={() => toggleSection('tasks')}
                />
                {expanded.tasks && results.tasks.map((task) => (
                  <GlassCard key={task.id} style={styles.card} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}>
                    <View style={styles.cardRow}>
                      <View
                        style={[
                          styles.resultCheckbox,
                          {
                            borderColor: task.status === 'completed' ? '#22C55E' : theme.colors.outlineVariant,
                            backgroundColor: task.status === 'completed' ? '#22C55E' : 'transparent',
                          },
                        ]}
                      >
                        {task.status === 'completed' && <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />}
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={task.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        {task.deadline && (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDateTime(task.deadline)}</Text>
                        )}
                      </View>
                      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] ?? theme.colors.outline }]} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'event') && results.events.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Events"
                  count={results.events.length}
                  expanded={expanded.events}
                  onToggle={() => toggleSection('events')}
                />
                {expanded.events && results.events.map((event) => (() => {
                  const eventIcon = event.type === 'birthday' ? 'gift-outline' as const
                    : event.type === 'anniversary' ? 'heart-outline' as const
                    : event.type === 'countdown' ? 'timer-outline' as const
                    : 'calendar-outline' as const;
                  const eventColor = TYPE_COLORS[event.type] ?? WARNING_COLOR;
                  return (
                    <GlassCard key={event.id} style={styles.card} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${eventColor}20` }]}>
                          <Ionicons name={eventIcon} size={16} color={eventColor} />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={event.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDateTime(event.date)}{event.location ? ` · ${event.location}` : ''}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  );
                })())}
              </View>
            )}

            {(filter === 'all' || filter === 'birthday') && results.birthdays.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Birthdays" count={results.birthdays.length} expanded={expanded.birthdays} onToggle={() => toggleSection('birthdays')} />
                {expanded.birthdays && results.birthdays.map((event) => (
                  <GlassCard key={event.id} style={styles.card} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#FF69B440' }]}>
                        <Ionicons name="gift-outline" size={16} color="#FF69B4" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={event.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDateTime(event.date)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'anniversary') && results.anniversaries.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Anniversaries" count={results.anniversaries.length} expanded={expanded.anniversaries} onToggle={() => toggleSection('anniversaries')} />
                {expanded.anniversaries && results.anniversaries.map((event) => (
                  <GlassCard key={event.id} style={styles.card} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#FF6B6B40' }]}>
                        <Ionicons name="heart-outline" size={16} color="#FF6B6B" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={event.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDateTime(event.date)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'countdown') && results.countdowns.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Countdowns" count={results.countdowns.length} expanded={expanded.countdowns} onToggle={() => toggleSection('countdowns')} />
                {expanded.countdowns && results.countdowns.map((event) => (
                  <GlassCard key={event.id} style={styles.card} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#FFA72640' }]}>
                        <Ionicons name="timer-outline" size={16} color="#FFA726" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={event.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDateTime(event.date)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'budget') && results.budgets.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Budgets" count={results.budgets.length} expanded={expanded.budgets} onToggle={() => toggleSection('budgets')} />
                {expanded.budgets && results.budgets.map((budget) => (
                  <GlassCard key={budget.id} style={styles.card} onPress={() => navigation.navigate('BudgetForm', { budgetId: budget.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#A78BFA20' }]}>
                        <Ionicons name="wallet-outline" size={16} color="#A78BFA" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={budget.category} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Limit {formatCurrency(budget.limit_amount)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'recurring') && results.recurring.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Recurring" count={results.recurring.length} expanded={expanded.recurring} onToggle={() => toggleSection('recurring')} />
                {expanded.recurring && results.recurring.map((rule) => (
                  <GlassCard key={rule.id} style={styles.card} onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}20` }]}>
                        <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={rule.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {rule.cadence}{rule.amount ? ` · ${formatCurrency(rule.amount)}` : ''}
                        </Text>
                      </View>
                      <Ionicons name={rule.enabled ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={rule.enabled ? '#22C55E' : theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {results.bills.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Bills" count={results.bills.length} expanded={expanded.bills} onToggle={() => toggleSection('bills')} />
                {expanded.bills && results.bills.map((bill) => (
                  <GlassCard key={bill.id} style={styles.card} onPress={() => navigation.navigate('BillForm', { billId: bill.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                        <Ionicons name="receipt-outline" size={16} color="#F59E0B" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={bill.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatCurrency(bill.amount)} · {bill.cycle}{bill.paid_status === 1 ? ' · paid' : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {results.goals.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Goals" count={results.goals.length} expanded={expanded.goals} onToggle={() => toggleSection('goals')} />
                {expanded.goals && results.goals.map((goal) => (
                  <GlassCard key={goal.id} style={styles.card} onPress={() => navigation.navigate('GoalForm', { goalId: goal.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#EC489920' }]}>
                        <Ionicons name="flag-outline" size={16} color="#EC4899" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={goal.title} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {results.incomes.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Income" count={results.incomes.length} expanded={expanded.incomes} onToggle={() => toggleSection('incomes')} />
                {expanded.incomes && results.incomes.map((income) => (
                  <GlassCard key={income.id} style={styles.card} onPress={() => navigation.navigate('IncomeForm', { incomeId: income.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#22C55E20' }]}>
                        <Ionicons name="trending-up-outline" size={16} color="#22C55E" />
                      </View>
                      <View style={styles.cardContent}>
                        <Highlight text={income.source} query={debouncedQuery} style={{ color: theme.colors.onSurface }} numberOfLines={1} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatCurrency(income.amount)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {results.loans.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Loans" count={results.loans.length} expanded={expanded.loans} onToggle={() => toggleSection('loans')} />
                {expanded.loans && results.loans.map((loan) => (
                  <GlassCard key={loan.id} style={styles.card} onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconBox, { backgroundColor: '#F9731620' }]}>
                        <Ionicons name="cash-outline" size={16} color="#F97316" />
                      </View>
                      <View style={styles.cardContent}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Draw {formatCurrency(loan.draw_amount_kes)}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {loan.status} · repaid {formatCurrency(loan.total_repaid_kes)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
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
  const theme = useTheme();
  if (!query.trim()) return <Text variant="bodyMedium" style={style} numberOfLines={numberOfLines}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text variant="bodyMedium" style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} variant="bodyMedium" style={{ backgroundColor: `${theme.colors.primary}40`, color: theme.colors.onSurface }}>{part}</Text>
        ) : part
      )}
    </Text>
  );
}

const WARNING_COLOR = '#F5CB5C';

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.base, gap: spacing.sm,
  },
  chipsBar: { flexGrow: 0, flexShrink: 0, marginTop: spacing.xs },
  chips: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsTrailing: { width: spacing.screenHorizontal },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingTop: 0, paddingBottom: BOTTOM_NAV_SAFE_AREA },
  idleState: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.sm },
  loadingState: { alignItems: 'center', paddingTop: spacing['2xl'], gap: spacing.sm },
  recentBox: { marginBottom: spacing.lg },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recentChips: { flexDirection: 'row', gap: spacing.sm },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  card: { marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 36, height: 36, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  resultCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  cardContent: { flex: 1 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
});
