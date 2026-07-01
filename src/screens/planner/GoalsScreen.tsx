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

export function GoalsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { goals, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Goals</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GoalForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {goals.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No goals yet.</Text>
        ) : (
          goals.map((goal) => {
            const percent = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
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
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                        {goal.deadline ? ` · by ${formatDate(goal.deadline, 'dd MMM yyyy')}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.percent, { color: colors.success }]}>{percent.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.success }]} />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  contentCol: { flex: 1, marginRight: spacing.sm },
  goalTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2 },
  percent: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  track: { height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.full },
});
