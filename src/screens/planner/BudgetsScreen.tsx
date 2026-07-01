import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useBudgetStore } from '../../store';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { GlassCard } from '../../components/common/GlassCard';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { formatCurrency, clamp } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export function BudgetsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { budgets, isLoading, loadBudgets } = useBudgetStore();

  useEffect(() => {
    loadBudgets(db);
  }, [db, loadBudgets]);

  const summary = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;
    let overBudgetCount = 0;
    budgets.forEach((item) => {
      totalLimit += item.budget.limit_amount;
      totalSpent += item.spent;
      if (item.spent > item.budget.limit_amount) overBudgetCount += 1;
    });
    const percent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, percent, overBudgetCount, count: budgets.length };
  }, [budgets]);

  const handleDelete = (id: string, category: string) => {
    Alert.alert('Delete budget', `Remove ${category} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await new BudgetRepository(db).softDelete(id);
          await loadBudgets(db);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.overline, { color: colors.textSecondary }]}>Spending Guardrails</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Budgets</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('BudgetForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.budget.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadBudgets(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
        ListHeaderComponent={
          <>
            <GlassCard variant="elevated" style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Month</Text>
                  <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(summary.totalSpent)}
                    <Text style={[styles.summarySlash, { color: colors.textTertiary }]}>
                      {' '}
                      / {formatCurrency(summary.totalLimit)}
                    </Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        summary.percent > 100 ? colors.danger + '20' : summary.percent > 80 ? colors.warning + '20' : colors.success + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          summary.percent > 100 ? colors.danger : summary.percent > 80 ? colors.warning : colors.success,
                      },
                    ]}
                  >
                    {summary.percent > 100 ? 'Over budget' : summary.percent > 80 ? 'Nearing limit' : 'On track'}
                  </Text>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${clamp(summary.percent, 0, 100)}%`,
                      backgroundColor:
                        summary.percent > 100 ? colors.danger : summary.percent > 80 ? colors.warning : colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.summaryMeta, { color: colors.textTertiary }]}>
                {summary.overBudgetCount > 0
                  ? `${summary.overBudgetCount} category${summary.overBudgetCount > 1 ? 'ies' : 'y'} over budget`
                  : summary.count === 0
                  ? 'No budgets set'
                  : 'All categories within budget'}
              </Text>
            </GlassCard>

            {summary.count > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Categories</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <BudgetCard item={item} onEdit={() => navigation.navigate('BudgetForm', { budgetId: item.budget.id })} onDelete={() => handleDelete(item.budget.id, item.budget.category)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.glassWhite }]}>
              <Ionicons name="wallet-outline" size={32} color={colors.accentPrimary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No budgets yet</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Tap + to create a spending guardrail for a category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function BudgetCard({
  item,
  onEdit,
  onDelete,
}: {
  item: { budget: { category: string; limit_amount: number; id: string }; spent: number; percent: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useThemeColors();
  const categoryColor = CATEGORY_COLORS[item.budget.category] ?? colors.textTertiary;
  const iconName = CATEGORY_ICONS[item.budget.category] ?? 'help-circle';
  const percent = clamp(item.percent, 0, 100);
  const isOver = item.spent > item.budget.limit_amount;
  const isWarning = !isOver && item.percent > 80;
  const statusColor = isOver ? colors.danger : isWarning ? colors.warning : colors.success;
  const statusLabel = isOver ? 'Over' : isWarning ? 'Close' : 'On track';

  return (
    <GlassCard style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={18} color={categoryColor} />
        </View>
        <View style={styles.budgetTitleCol}>
          <Text style={[styles.category, { color: colors.textPrimary }]}>{item.budget.category}</Text>
          <Text style={[styles.budgetLimit, { color: colors.textTertiary }]}>
            Limit {formatCurrency(item.budget.limit_amount)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.amounts}>
        <Text style={[styles.spent, { color: colors.textSecondary }]}>
          {formatCurrency(item.spent)} spent ({item.percent.toFixed(0)}%)
        </Text>
        <Text style={[styles.remaining, { color: isOver ? colors.danger : colors.textSecondary }]}>
          {isOver ? `+${formatCurrency(item.spent - item.budget.limit_amount)}` : `${formatCurrency(item.budget.limit_amount - item.spent)} left`}
        </Text>
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color={colors.accentPrimary} />
          <Text style={[styles.actionText, { color: colors.accentPrimary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerText: {
    alignItems: 'center',
  },
  overline: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.xl,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  summaryAmount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  summarySlash: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
  },
  badge: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  summaryMeta: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.base,
  },
  budgetCard: {
    marginBottom: spacing.base,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetTitleCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  category: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  budgetLimit: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  spent: {
    fontSize: typography.sizes.sm,
  },
  remaining: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
