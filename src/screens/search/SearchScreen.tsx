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
import { spacing, typography, borderRadius } from '../../theme';

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
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
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
      <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={16} color="#FFF" />
            </View>
            <View style={styles.cardContent}>
              <Highlight text={title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
              <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            {right}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  }

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
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.chips}
      >
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
        <View style={styles.chipsTrailing} />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Idle state */}
        {isIdle && recentSearches.length === 0 && (
          <View style={styles.idleState}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>Search everything</Text>
            <Text style={[styles.idleHint, { color: colors.textSecondary }]}>
              Transactions, tasks, events, birthdays and more.
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
                          <Highlight text={tx.merchant} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
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
                        <View
                          style={[
                            styles.resultCheckbox,
                            {
                              borderColor: task.status === 'completed' ? colors.success : colors.border,
                              backgroundColor: task.status === 'completed' ? colors.success : 'transparent',
                            },
                          ]}
                        >
                          {task.status === 'completed' && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={task.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
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
                {expanded.events && results.events.map((event) => (() => {
                  const eventIcon = event.type === 'birthday' ? 'gift-outline' as const
                    : event.type === 'anniversary' ? 'heart-outline' as const
                    : event.type === 'countdown' ? 'timer-outline' as const
                    : 'calendar-outline' as const;
                  const eventColor = event.type === 'birthday' ? '#FF69B4'
                    : event.type === 'anniversary' ? '#FF6B6B'
                    : event.type === 'countdown' ? '#FFA726'
                    : colors.warning;
                  return (
                    <TouchableOpacity key={event.id} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                      <GlassCard style={styles.card}>
                        <View style={styles.cardRow}>
                          <View style={[styles.iconBox, { backgroundColor: `${eventColor}20` }]}>
                            <Ionicons name={eventIcon} size={16} color={eventColor} />
                          </View>
                          <View style={styles.cardContent}>
                            <Highlight text={event.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                              {formatDateTime(event.date)}{event.location ? ` · ${event.location}` : ''}
                            </Text>
                          </View>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })())}
              </View>
            )}

            {/* Birthdays */}
            {(filter === 'all' || filter === 'birthday') && results.birthdays.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Birthdays"
                  count={results.birthdays.length}
                  expanded={expanded.birthdays}
                  onToggle={() => toggleSection('birthdays')}
                  colors={colors}
                />
                {expanded.birthdays && results.birthdays.map((event) => (
                  <TouchableOpacity key={event.id} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#FF69B440' }]}>
                          <Ionicons name="gift-outline" size={16} color="#FF69B4" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={event.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatDateTime(event.date)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Anniversaries */}
            {(filter === 'all' || filter === 'anniversary') && results.anniversaries.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Anniversaries"
                  count={results.anniversaries.length}
                  expanded={expanded.anniversaries}
                  onToggle={() => toggleSection('anniversaries')}
                  colors={colors}
                />
                {expanded.anniversaries && results.anniversaries.map((event) => (
                  <TouchableOpacity key={event.id} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#FF6B6B40' }]}>
                          <Ionicons name="heart-outline" size={16} color="#FF6B6B" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={event.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatDateTime(event.date)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Countdowns */}
            {(filter === 'all' || filter === 'countdown') && results.countdowns.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Countdowns"
                  count={results.countdowns.length}
                  expanded={expanded.countdowns}
                  onToggle={() => toggleSection('countdowns')}
                  colors={colors}
                />
                {expanded.countdowns && results.countdowns.map((event) => (
                  <TouchableOpacity key={event.id} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFA72640' }]}>
                          <Ionicons name="timer-outline" size={16} color="#FFA726" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={event.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatDateTime(event.date)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
                          <Highlight text={budget.category} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
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

            {/* Recurring */}
            {(filter === 'all' || filter === 'recurring') && results.recurring.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Recurring"
                  count={results.recurring.length}
                  expanded={expanded.recurring}
                  onToggle={() => toggleSection('recurring')}
                  colors={colors}
                />
                {expanded.recurring && results.recurring.map((rule) => (
                  <TouchableOpacity key={rule.id} onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${colors.info ?? '#4DB8FF'}20` }]}>
                          <Ionicons name="repeat-outline" size={16} color={colors.info ?? '#4DB8FF'} />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={rule.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {rule.cadence}{rule.amount ? ` · ${formatCurrency(rule.amount)}` : ''}
                          </Text>
                        </View>
                        <Ionicons name={rule.enabled ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={rule.enabled ? colors.success : colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bills */}
            {results.bills.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Bills"
                  count={results.bills.length}
                  expanded={expanded.bills}
                  onToggle={() => toggleSection('bills')}
                  colors={colors}
                />
                {expanded.bills && results.bills.map((bill) => (
                  <TouchableOpacity key={bill.id} onPress={() => navigation.navigate('BillForm', { billId: bill.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                          <Ionicons name="receipt-outline" size={16} color="#F59E0B" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={bill.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatCurrency(bill.amount)} · {bill.cycle}{bill.paid_status === 1 ? ' · paid' : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Goals */}
            {results.goals.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Goals"
                  count={results.goals.length}
                  expanded={expanded.goals}
                  onToggle={() => toggleSection('goals')}
                  colors={colors}
                />
                {expanded.goals && results.goals.map((goal) => (
                  <TouchableOpacity key={goal.id} onPress={() => navigation.navigate('GoalForm', { goalId: goal.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#EC489920' }]}>
                          <Ionicons name="flag-outline" size={16} color="#EC4899" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={goal.title} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Incomes */}
            {results.incomes.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Income"
                  count={results.incomes.length}
                  expanded={expanded.incomes}
                  onToggle={() => toggleSection('incomes')}
                  colors={colors}
                />
                {expanded.incomes && results.incomes.map((income) => (
                  <TouchableOpacity key={income.id} onPress={() => navigation.navigate('IncomeForm', { incomeId: income.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#22C55E20' }]}>
                          <Ionicons name="trending-up-outline" size={16} color="#22C55E" />
                        </View>
                        <View style={styles.cardContent}>
                          <Highlight text={income.source} query={debouncedQuery} style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1} />
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {formatCurrency(income.amount)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Loans (Fuliza) */}
            {results.loans.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Loans"
                  count={results.loans.length}
                  expanded={expanded.loans}
                  onToggle={() => toggleSection('loans')}
                  colors={colors}
                />
                {expanded.loans && results.loans.map((loan) => (
                  <TouchableOpacity key={loan.id} onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })}>
                    <GlassCard style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#F9731620' }]}>
                          <Ionicons name="cash-outline" size={16} color="#F97316" />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            Draw {formatCurrency(loan.draw_amount_kes)}
                          </Text>
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {loan.status} · repaid {formatCurrency(loan.total_repaid_kes)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.base, gap: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, borderWidth: 1,
    paddingHorizontal: spacing.base, height: 48, gap: spacing.sm,
  },
  input: { flex: 1, fontSize: typography.sizes.base, height: '100%' },
  chips: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsTrailing: { width: spacing.screenHorizontal },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, gap: 4, marginRight: spacing.sm,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingTop: 0, paddingBottom: spacing['4xl'] },
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
  resultCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  cardSub: { fontSize: typography.sizes.sm, marginTop: 2 },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, marginLeft: spacing.sm },
  priorityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
});
