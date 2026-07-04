import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, Button, Card, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { animateLayout } from '../../utils/animation';

const SEMANTIC = {
  success: '#7BC47B',
};

export function GoalsScreen() {
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2500} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerTextCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              PERSONAL GROWTH
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Goals
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {activeGoals.length} active goal{activeGoals.length === 1 ? '' : 's'}
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('GoalForm')}
          />
        </View>

        {goals.length === 0 ? (
          <EmptyState icon="flag-outline" title="No goals yet" subtitle="Set a goal to start tracking your progress." />
        ) : (
          goals.map((goal) => {
            const percent = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
            const isCompleted = goal.status === 'completed';
            return (
              <TouchableRipple
                key={goal.id}
                onPress={() => navigation.navigate('GoalForm', { goalId: goal.id })}
                style={{ marginBottom: spacing.base }}
                rippleColor={theme.colors.primary}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.contentCol}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      {goal.category ? (
                        <Text variant="labelSmall" style={{ color: theme.colors.primary, textTransform: 'capitalize' }}>
                          {goal.category}
                        </Text>
                      ) : null}
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                      </Text>
                      {goal.description ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                          {goal.description}
                        </Text>
                      ) : null}
                      {goal.deadline ? (
                        <View style={[styles.deadlineChip, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Due {formatDate(goal.deadline, 'dd MMM yyyy')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="titleMedium" style={{ color: SEMANTIC.success }}>{percent.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant }]}>
                    <View style={[styles.fill, { width: `${percent}%`, backgroundColor: SEMANTIC.success }]} />
                  </View>
                  <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
                    {!isCompleted && (
                      <>
                        <Button
                          mode="text"
                          compact
                          icon={() => <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />}
                          onPress={() => { setLogGoalId(goal.id); setLogAmount(''); }}
                          textColor={theme.colors.primary}
                          style={{ marginRight: spacing.sm }}
                        >
                          Log Progress
                        </Button>
                        <Button
                          mode="text"
                          compact
                          icon={() => <Ionicons name="checkmark-circle-outline" size={16} color={SEMANTIC.success} />}
                          onPress={() => handleComplete(goal.id)}
                          textColor={SEMANTIC.success}
                          style={{ marginRight: spacing.sm }}
                        >
                          Mark Complete
                        </Button>
                      </>
                    )}
                    <Button
                      mode="text"
                      compact
                      icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                      onPress={() => handleDelete(goal.id, goal.title)}
                      textColor={theme.colors.error}
                    >
                      Delete
                    </Button>
                  </View>
                </GlassCard>
              </TouchableRipple>
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
          <Card style={[styles.modalCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
            <Card.Content style={{ gap: spacing.sm }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Log progress</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Add to {goals.find((g) => g.id === logGoalId)?.title ?? 'goal'}
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={logAmount}
                onChangeText={setLogAmount}
                keyboardType="decimal-pad"
                placeholder="Amount"
                style={{ backgroundColor: 'transparent' }}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => setLogGoalId(null)} textColor={theme.colors.onSurfaceVariant}>
                  Cancel
                </Button>
                <Button mode="text" onPress={handleLogProgress} textColor={theme.colors.primary}>
                  Log
                </Button>
              </View>
            </Card.Content>
          </Card>
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  card: { padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  contentCol: { flex: 1, marginRight: spacing.sm },
  deadlineChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  track: { height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.full },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
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
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
