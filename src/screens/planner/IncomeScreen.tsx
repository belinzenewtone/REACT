import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export function IncomeScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { incomes, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Income</Text>
        <View style={{ width: 24 }} />
      </View>

      {incomes.length > 0 && (
        <GlassCard variant="elevated" style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>{formatCurrency(totalIncome)}</Text>
          <Text style={[styles.summaryMeta, { color: colors.textTertiary }]}>{incomes.length} source{incomes.length > 1 ? 's' : ''}</Text>
        </GlassCard>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {incomes.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.glassWhite }]}>
              <Ionicons name="cash-outline" size={32} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No income yet</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Track your salary, side hustles, and other income sources.
            </Text>
          </View>
        ) : (
          incomes.map((income) => (
            <TouchableOpacity
              key={income.id}
              onPress={() => navigation.navigate('IncomeForm', { incomeId: income.id })}
            >
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.contentCol}>
                    <Text style={[styles.source, { color: colors.textPrimary }]} numberOfLines={1}>
                      {income.source}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {formatDate(income.date)}
                      {income.is_recurring ? ` · ${income.frequency}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: colors.success }]}>
                    {formatCurrency(income.amount)}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.success }]}
        onPress={() => navigation.navigate('IncomeForm')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color={colors.textInverse} />
        <Text style={[styles.fabText, { color: colors.textInverse }]}>Add Income</Text>
      </TouchableOpacity>
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
  summaryCard: {
    marginHorizontal: spacing.lg,
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
  summaryMeta: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
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
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  source: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2, textTransform: 'capitalize' },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  fab: {
    position: 'absolute',
    left: '50%',
    bottom: spacing.lg,
    transform: [{ translateX: -72 }],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
