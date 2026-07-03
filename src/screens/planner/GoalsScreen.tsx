import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput } from 'react-native';
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
  const [logGoalId, setLogGoalId] = useState<string | null>(null);
  const [logAmount, setLogAmount] = useState('');

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

  const handleLogProgress = () => {
    const goal = goals.find((g) => g.id === logGoalId);
    if (!goal) { setLogGoalId(null); return; }
    const delta = parseFloat(logAmount);
    if (!Number.isFinite(delta) || delta <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive number.');
      return;
    }
    const next = Math.min(goal.current_value + delta, goal.target_value);
    const reached = next >= goal.target_value;
    animateLayout();
    updateGoal(db, goal.id, {
      currentValue: next,
      ...(reached ? { status: 'completed' as const } : {}),
    });
    setBanner(reached ? `Goal reached: ${goal.title} 🎉` : `Logged ${formatCurrency(delta)} · ${goal.title}`);
    setLogGoalId(null);
    setLogAmount('');
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
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Goals</Text>
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
                      <>
                        <TouchableOpacity style={styles.actionButton} onPress={() => { setLogGoalId(goal.id); setLogAmount(''); }}>
                          <Ionicons name="add-circle-outline" size={16} color={colors.accentPrimary} />
                          <Text style={[styles.actionText, { color: colors.accentPrimary }]}>Log Progress</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleComplete(goal.id)}>
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                          <Text style={[styles.actionText, { color: colors.success }]}>Mark Complete</Text>
                        </TouchableOpacity>
                      </>
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

      <Modal
        visible={logGoalId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setLogGoalId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log progress</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Add to {goals.find((g) => g.id === logGoalId)?.title ?? 'goal'}
            </Text>
            <TextInput
              value={logAmount}
              onChangeText={setLogAmount}
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setLogGoalId(null)} style={styles.modalBtn}>
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogProgress} style={styles.modalBtn}>
                <Text style={[styles.actionText, { color: colors.accentPrimary }]}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  modalSub: { fontSize: typography.sizes.sm },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  modalBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
});
