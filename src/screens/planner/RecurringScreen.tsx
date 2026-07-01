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

export function RecurringScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { recurringRules, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Recurring</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RecurringForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recurringRules.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No recurring rules yet.</Text>
        ) : (
          recurringRules.map((rule) => (
            <TouchableOpacity
              key={rule.id}
              onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}
            >
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.contentCol}>
                    <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {rule.title}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {rule.type} · {rule.cadence} · Next: {formatDate(rule.next_run_at, 'dd MMM yyyy')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {rule.amount ? (
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>
                        {formatCurrency(rule.amount)}
                      </Text>
                    ) : null}
                    <Text style={[styles.status, { color: rule.enabled ? colors.success : colors.textTertiary }]}>
                      {rule.enabled ? 'Active' : 'Paused'}
                    </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  titleText: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2, textTransform: 'capitalize' },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  status: { fontSize: typography.sizes.xs, marginTop: 2 },
});
