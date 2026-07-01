import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { animateLayout } from '../../utils/animation';

export function IncomeScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { incomes, loadAll, deleteIncome } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  const handleDelete = (id: string, source: string) => {
    Alert.alert('Delete income', `Remove ${source}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteIncome(db, id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Income</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {incomes.length} entr{incomes.length === 1 ? 'y' : 'ies'} tracked
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('IncomeForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        {incomes.length > 0 && (
          <GlassCard variant="elevated" style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>{formatCurrency(totalIncome)}</Text>
            <Text style={[styles.summaryMeta, { color: colors.textTertiary }]}>{incomes.length} source{incomes.length > 1 ? 's' : ''}</Text>
          </GlassCard>
        )}

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
                    {income.note ? (
                      <Text style={[styles.note, { color: colors.textTertiary }]} numberOfLines={1}>
                        {income.note}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.trailingCol}>
                    <Text style={[styles.amount, { color: colors.success }]}>
                      {formatCurrency(income.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(income.id, income.source)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
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
    paddingBottom: spacing.sm,
  },
  headerTextCol: { alignItems: 'center' },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
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
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingTop: spacing.sm },
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
  note: { fontSize: typography.sizes.xs, marginTop: 2 },
  trailingCol: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  deleteButton: { padding: 2 },
});
