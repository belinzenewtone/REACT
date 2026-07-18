import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, IconButton, Button, useTheme } from 'react-native-paper';
import { useDataVersion } from '../../store/dataVersion';
import { useSQLiteContext } from 'expo-sqlite';
import { useBudgetStore } from '../../store';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { GlassCard } from '../../components/common/GlassCard';
import { LifeOSSwitch } from '../../components/common/LifeOSSwitch';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { formatCurrency, clamp } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { animateLayout } from '../../utils/animation';

const SEMANTIC = {
  success: '#7BC47B',
  warning: '#F5CB5C',
  danger: '#FF6B6B',
};

export function BudgetsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { budgets, isLoading, loadBudgets } = useBudgetStore();
  const dataVersion = useDataVersion((s) => s.version);
  const loadedVersion = useRef(-1);

  useFocusEffect(
    useCallback(() => {
      if (dataVersion > loadedVersion.current) {
        loadedVersion.current = dataVersion;
        loadBudgets(db);
      }
    }, [db, loadBudgets, dataVersion])
  );

  const activeBudgetItems = useMemo(() => budgets.filter((item) => item.isActive), [budgets]);

  const summary = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;
    let overBudgetCount = 0;
    activeBudgetItems.forEach((item) => {
      totalLimit += item.budget.limit_amount;
      totalSpent += item.spent;
      if (item.spent > item.budget.limit_amount) overBudgetCount += 1;
    });
    const percent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, percent, overBudgetCount, count: activeBudgetItems.length, totalCount: budgets.length };
  }, [activeBudgetItems, budgets.length]);

  const handleDelete = useCallback((id: string, category: string) => {
    Alert.alert('Delete budget', `Remove ${category} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await new BudgetRepository(db).softDelete(id);
          animateLayout();
          await loadBudgets(db);
        },
      },
    ]);
  }, [db, loadBudgets]);

  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    animateLayout();
    const item = budgets.find((b) => b.budget.id === id);
    await new BudgetRepository(db).update(id, { isActive: active });
    await loadBudgets(db);
    if (active && item) {
      await checkBudgetThresholds(db, item.budget.category);
    }
  }, [db, loadBudgets, budgets]);

  const handleEdit = useCallback((id: string) => {
    navigation.navigate('BudgetForm', { budgetId: id });
  }, [navigation]);

  const renderBudgetItem = useCallback(({ item }: { item: typeof budgets[number] }) => (
    <BudgetCard
      item={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
    />
  ), [handleEdit, handleDelete, handleToggleActive]);

  const summaryStatus =
    summary.percent > 100 ? 'danger' : summary.percent > 80 ? 'warning' : 'success';
  const summaryColor = SEMANTIC[summaryStatus];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <FlashList
        data={budgets}
        keyExtractor={(item) => item.budget.id}
        estimatedItemSize={180}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadBudgets(db)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <IconButton
                icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
                onPress={() => navigation.goBack()}
              />
              <View style={styles.headerText}>
                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                  SPENDING GUARDRAILS
                </Text>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                  Budgets
                </Text>
              </View>
              <IconButton
                icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
                onPress={() => navigation.navigate('BudgetForm')}
              />
            </View>

            <GlassCard variant="elevated" style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    This Month
                  </Text>
                  <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                    {formatCurrency(summary.totalSpent)}
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                      {' '}
                      / {formatCurrency(summary.totalLimit)}
                    </Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: `${summaryColor}20` },
                  ]}
                >
                  <Text variant="labelSmall" style={{ color: summaryColor }}>
                    {summary.percent > 100 ? 'Over budget' : summary.percent > 80 ? 'Nearing limit' : 'On track'}
                  </Text>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${clamp(summary.percent, 0, 100)}%`,
                      backgroundColor: summaryColor,
                    },
                  ]}
                />
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
                {summary.overBudgetCount > 0
                  ? `${summary.overBudgetCount} category${summary.overBudgetCount > 1 ? 'ies' : 'y'} over budget`
                  : summary.totalCount === 0
                  ? 'No budgets set'
                  : 'All categories within budget'}
              </Text>
            </GlassCard>

            {summary.totalCount > 0 && (
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
                Categories
              </Text>
            )}
          </>
        }
        renderItem={renderBudgetItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Ionicons name="wallet-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>No budgets yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
              Tap + to create a spending guardrail for a category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const BudgetCard = React.memo(function BudgetCard({
  item,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  item: { budget: { category: string; limit_amount: number; id: string; period: string }; spent: number; percent: number; isActive: boolean };
  onEdit: (id: string) => void;
  onDelete: (id: string, category: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const theme = useTheme();
  const categoryColor = CATEGORY_COLORS[item.budget.category] ?? theme.colors.onSurfaceVariant;
  const iconName = CATEGORY_ICONS[item.budget.category] ?? 'help-circle';
  const percent = clamp(item.percent, 0, 100);
  const isOver = item.spent > item.budget.limit_amount;
  const isWarning = !isOver && item.percent > 80;
  const statusColor = isOver ? SEMANTIC.danger : isWarning ? SEMANTIC.warning : SEMANTIC.success;
  const statusLabel = isOver ? 'Over' : isWarning ? 'Close' : 'On track';

  const handleEdit = useCallback(() => onEdit(item.budget.id), [onEdit, item.budget.id]);
  const handleDelete = useCallback(() => onDelete(item.budget.id, item.budget.category), [onDelete, item.budget.id, item.budget.category]);
  const handleToggle = useCallback((active: boolean) => onToggleActive(item.budget.id, active), [onToggleActive, item.budget.id]);

  return (
    <GlassCard style={StyleSheet.flatten([styles.budgetCard, !item.isActive && { opacity: 0.7 }])}>
      <View style={styles.budgetHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={18} color={categoryColor} />
        </View>
        <View style={styles.budgetTitleCol}>
          <View style={styles.categoryRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              {item.budget.category}
            </Text>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {item.budget.period.charAt(0).toUpperCase() + item.budget.period.slice(1).toLowerCase()} · Limit{' '}
            {formatCurrency(item.budget.limit_amount)}
          </Text>
        </View>
        <View style={styles.budgetHeaderActions}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text variant="labelSmall" style={{ color: statusColor }}>{statusLabel}</Text>
          </View>
          <LifeOSSwitch value={item.isActive} onValueChange={handleToggle} />
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.amounts}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatCurrency(item.spent)} spent ({item.percent.toFixed(0)}%)
        </Text>
        <Text variant="bodyMedium" style={{ color: isOver ? SEMANTIC.danger : theme.colors.onSurfaceVariant, fontWeight: '500' }}>
          {isOver ? `+${formatCurrency(item.spent - item.budget.limit_amount)}` : `${formatCurrency(item.budget.limit_amount - item.spent)} left`}
        </Text>
      </View>

      <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
        <Button
          mode="text"
          compact
          icon={() => <Ionicons name="create-outline" size={16} color={theme.colors.primary} />}
          onPress={handleEdit}
          textColor={theme.colors.primary}
          style={{ marginRight: spacing.sm }}
        >
          Edit
        </Button>
        <Button
          mode="text"
          compact
          icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
          onPress={handleDelete}
          textColor={theme.colors.error}
        >
          Delete
        </Button>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
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
  badge: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
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
  budgetCard: {
    marginBottom: spacing.base,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  budgetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  statusBadge: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
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
});
