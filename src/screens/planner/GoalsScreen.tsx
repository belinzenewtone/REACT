import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { animateLayout } from '../../utils/animation';

export function GoalsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { goals, loadAll, updateGoal, deleteGoal } = usePlannerStore();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  const handleComplete = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    animateLayout();
    updateGoal(db, id, { status: 'completed' });
    setBanner(`${goal?.title ?? 'Goal'} marked as complete`);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete goal', `Remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteGoal(db, id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2500} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Personal Growth</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Goals</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {activeGoals.length} active goal{activeGoals.length === 1 ? '' : 's'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('GoalForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <EmptyState icon="flag-outline" title="No goals yet" subtitle="Set a goal to start tracking your progress." />
        ) : (
          goals.map((goal) => {
            const percent = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
            const isCompleted = goal.status === 'completed';
            return (
              <TouchableOpacity
                key={goal.id}
                onPress={() => navigation.navigate('GoalForm', { goalId: goal.id })}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.contentCol}>
                      <Text style={[styles.goalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      {goal.category ? (
                        <Text style={[styles.category, { color: colors.accentPrimary }]}>{goal.category}</Text>
                      ) : null}
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                      </Text>
                      {goal.description ? (
                        <Text style={[styles.description, { color: colors.textTertiary }]} numberOfLines={2}>
                          {goal.description}
                        </Text>
                      ) : null}
                      {goal.deadline ? (
                        <View style={[styles.deadlineChip, { borderColor: colors.border, backgroundColor: colors.glassWhite }]}>
                          <Text style={[styles.deadlineText, { color: colors.textSecondary }]}>
                            Due {formatDate(goal.deadline, 'dd MMM yyyy')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.percent, { color: colors.success }]}>{percent.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.success }]} />
                  </View>
                  <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    {!isCompleted && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleComplete(goal.id)}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        <Text style={[styles.actionText, { color: colors.success }]}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(goal.id, goal.title)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })
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
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: 2 },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: spacing['4xl'] },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  contentCol: { flex: 1, marginRight: spacing.sm },
  goalTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  category: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, marginTop: 2, textTransform: 'capitalize' },
  meta: { fontSize: typography.sizes.sm, marginTop: 2 },
  description: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
  deadlineChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  deadlineText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  percent: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  track: { height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.full },
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
  actionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
});
