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
import { LifeOSSwitch } from '../../components/common/LifeOSSwitch';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import { animateLayout } from '../../utils/animation';

export function RecurringScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { recurringRules, loadAll, updateRecurringRule, deleteRecurringRule } = usePlannerStore();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const handleToggle = (id: string, enabled: boolean) => {
    const rule = recurringRules.find((r) => r.id === id);
    updateRecurringRule(db, id, { enabled });
    setBanner(`${rule?.title ?? 'Rule'} ${enabled ? 'enabled' : 'paused'}`);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete rule', `Remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteRecurringRule(db, id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2000} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Automation</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Recurring</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Subscriptions and repeating items</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RecurringForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>

        {recurringRules.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title="No recurring rules yet"
            subtitle="Add a rule to automate subscriptions, bills, or repeating tasks."
          />
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
                  <View style={styles.trailingCol}>
                    {rule.amount ? (
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>
                        {formatCurrency(rule.amount)}
                      </Text>
                    ) : null}
                    <LifeOSSwitch value={!!rule.enabled} onValueChange={(v) => handleToggle(rule.id, v)} />
                  </View>
                </View>
                <View style={[styles.actions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(rule.id, rule.title)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  titleText: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2, textTransform: 'capitalize' },
  trailingCol: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
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
  },
  actionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
});
